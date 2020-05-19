const database = require('../db');
const spotify = require('../models/spotify');
const spotify_helper = require('../models/spotify_helper');
const cache_helper = require('../models/cache_helper');
const helper = require('./helper');
const logger = require('../models/logger');

/**
 * Get the new releases from the spotify API
 * @param {SpotifyWebApi} api
 * @param {int} limit 
 * @param {int} offset 
 */
function getReleasePage(api, limit, offset) {
    return new Promise((resolve, reject) => {
        let cache_key = 'new_releases_' + limit + '_' + offset;
        let cache_expire = cache_helper.getExpiresSeconds('hour');

        cache_helper.get(cache_key).then(function (result) {
            resolve(result);
        }).catch(function() {
            api.getNewReleases({ limit: limit, offset: offset }).then(function (releases) {
                resolve(releases.body);
                cache_helper.save(cache_key, releases.body, cache_expire, 'json');
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
            var results = await database.executeQuery(`SELECT id FROM Releases WHERE uri = ? OR (artist = ? AND album = ?)`, username, [
                release.uri, 
                release.artists[0].name, 
                release.name
            ]);

            if (results.length) {
                await database.executeQuery(`UPDATE Releases SET artist = ?, album = ?, image = ?, type = ?, release_date= ? WHERE id = ?`, username, [
                    release.artists[0].name,
                    release.name,
                    (release.images[1] ? release.images[1].url : ''),
                    release.album_type,
                    release.release_date,
                    results[0].id
                ]);
            } else {
                await database.executeQuery(`INSERT INTO Releases (artist, album, image, type, uri, release_date) VALUES (?, ?, ?, ?, ?, ?)`, username, [
                    release.artists[0].name,
                    release.name,
                    (release.images[1] ? release.images[1].url : ''),
                    release.album_type,
                    release.uri,
                    release.release_date,
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
    let limit = 20;
    let offset = 0;
    var api = await spotify.getApi(username);
    var releases = await getReleasePage(api, limit, offset);

    total = releases.albums.total;
    pages = Math.ceil(total / limit);

    await saveReleases(releases.albums.items, username);

    for (i = 2; i <= pages; i++) {
        offset += limit;

        releases = await getReleasePage(api, limit, offset);
        await saveReleases(releases.albums.items, username);
    }
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

                let spotify_username = await spotify_helper.getValue('username', username);
                if (spotify_username && spotify_username.length) {
                    logger.log(logger.INFO, `Spotify - ${username} - get newest releases`);

                    // Download and save the new releases
                    await updateNewReleases(username);
                    // Remove old non-matches
                    cleanupReleases(username);
                    // A bit arbitrary, but wait for a bit before processing the releases
                    setTimeout(saveMatches, 30000, username);
                }
            }
        } catch (ex) {
            logger.log(logger.ERROR, `spotify releases`, ex);
        }
    },
}
