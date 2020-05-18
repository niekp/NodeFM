const database = require('../db');
const cache_helper = require('../models/cache_helper');
const helper = require('./helper');
const logger = require('../models/logger');
const request = require("request");

/**
 * Get the new releases from the itunes API
 * @param {string} country 
 */
function getReleasePage(country) {
    return new Promise((resolve, reject) => {
        let cache_key = 'new_releases_' + country;
        let cache_expire = cache_helper.getExpiresSeconds('hour');

        cache_helper.get(cache_key).then(function (result) {
            resolve(result);
        }).catch(function() {
            if (!country) {
                country = 'us';
            }

            request.get('https://rss.itunes.apple.com/api/v1/' + country + '/apple-music/new-releases/all/100/explicit.json', (error, response, body) => {
                let json = JSON.parse(body);
                cache_helper.save(cache_key, json.feed.results, cache_expire, 'json');
                resolve(json.feed.results);
            });
        });
    });
}

/**
 * Save the albums to the DB
 * @param {JSON} items The API result with the albums
 * @param {string} username 
 */
async function saveReleases(items, username) {
    for (let i = 0; i < items.length; i++) {
        let release = items[i];
    
        try {
            var results = await database.executeQuery(`SELECT id FROM Releases WHERE uri = ? OR (artist LIKE ? AND album LIKE ?)`, username, [
                release.id, 
                release.artistName, 
                release.name
            ]);

            if (results.length) {
                await database.executeQuery(`UPDATE Releases SET artist = ?, album = ?, image = ?, type = ?, release_date= ? WHERE id = ?`, username, [
                    release.artistName,
                    release.name,
                    release.artworkUrl100,
                    release.kind,
                    release.releaseDate,
                    results[0].id
                ]);
            } else {
                await database.executeQuery(`INSERT INTO Releases (artist, album, image, type, release_date, uri) VALUES (?, ?, ?, ?, ?, ?)`, username, [
                    release.artistName,
                    release.name,
                    release.artworkUrl100,
                    release.kind,
                    release.releaseDate,
                    release.id
                ]);
            }
        }
        catch(ex) {
            logger.log(logger.ERROR, `Error looking up releases`, ex);
        }
    }
}

/**
 * Call the get and save release functions for all pages
 * @param {string} username 
 */
async function updateNewReleases(username) {
    var releases = await getReleasePage('nl');
    await saveReleases(releases, username);

    releases = await getReleasePage('us');
    await saveReleases(releases, username);
}

/**
 * Match the releases against the last.fm data
 * @param {string} username 
 */
async function saveMatches(username) {
    try {
        // Get all unmatched releases and the releases of the past 30 days
        var releases = await database.executeQuery(`SELECT * FROM Releases WHERE release_date >= date('now', '-30 day') OR match IS NULL`, username);
        
        for (let i = 0; i < releases.length; i++) {
            let release = releases[i];

            // Use like to select case insensitive
            let result = await database.executeQuery(`select * from artist where name LIKE ? AND id in (
                                select artist_id from Scrobble
                                group by artist_id
                                HAVING count(*) > 50
                                )`, username, [release.artist])
                                
            await database.executeQuery(`UPDATE Releases SET Match = ? WHERE id = ?`, username, [
                (result.length ? 1 : 0),
                release.id
            ]);
        }
    } catch (ex) {
        logger.log(logger.ERROR, `Error getting releases to match`, ex);
    }
}

/**
 * Delete old releases that werent a match
 * @param {string} username 
 */
function cleanupReleases(username) {
    database.executeQuery(`DELETE FROM Releases WHERE release_date < date('now', '-180 day') AND match = 0`, username).catch(function (ex) {
        logger.log(logger.ERROR, `Error cleaning up`, ex);
    });
}


module.exports = {
    run: async function () {
        try {
            users = await helper.getUsers();
            for (username of users) {
                await helper.connect(username);
                    
                // Download and save the new releases
                await updateNewReleases(username);
                // Remove old non-matches
                cleanupReleases(username);
                // A bit arbitrary, but wait for a bit before processing the releases
                setTimeout(saveMatches, 30000, username);
            }
        } catch (ex) {
            logger.log(logger.ERROR, `itunes releases`, ex);
        }
    },
}
