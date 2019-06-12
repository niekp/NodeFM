var database = require('../db.js')
const spotify = require('../models/spotify.js');
const spotify_helper = require('../models/spotify_helper.js');
var cache_helper = require('../models/cache_helper.js');
var helper = require('./helper.js');
var logger = require('../models/logger.js');

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
function saveReleases(items, username) {
    items.forEach(function(release) {
        database.executeQuery(`SELECT id FROM Releases WHERE uri = ?`, username, [release.uri]).then(function (results) {
            if (results.length) {
                database.executeQuery(`UPDATE Releases SET artist = ?, album = ?, image = ?, type = ?, release_date= ? WHERE id = ?`, username, [
                    release.artists[0].name,
                    release.name,
                    (release.images[1] ? release.images[1].url : ''),
                    release.album_type,
                    release.release_date,
                    results[0].id
                ]).catch(function(ex) {
                    logger.log(logger.ERROR, `Error updating releases`, ex);
                })
            } else {
                database.executeQuery(`INSERT INTO Releases (artist, album, image, type, uri, release_date) VALUES (?, ?, ?, ?, ?, ?)`, username, [
                    release.artists[0].name,
                    release.name,
                    (release.images[1] ? release.images[1].url : ''),
                    release.album_type,
                    release.uri,
                    release.release_date,
                ]).catch(function (ex) {
                    logger.log(logger.ERROR, `Error inserting releases`, ex);
                })
            }
        }).catch(function (ex) {
            logger.log(logger.ERROR, `Error looking up releases`, ex);
        })
    });
}

/**
 * Call the get and save release functions for all pages
 * @param {string} username 
 */
function updateNewReleases(username) {
    let limit = 20;
    let offset = 0;
    spotify.getApi(username).then(function (api) {
        
        getReleasePage(api, limit, offset).then(function (releases) {
            total = releases.albums.total;
            pages = Math.ceil(total / limit);

            saveReleases(releases.albums.items, username);
            for (i = 2; i <= pages; i++) {
                offset += limit;

                getReleasePage(api, limit, offset).then(function (releases) {
                    saveReleases(releases.albums.items, username);
                });
            }
        });

    });
}

/**
 * Match the releases against the last.fm data
 * @param {string} username 
 */
function saveMatches(username) {
    // Get all unmatched releases and the releases of the past 30 days
    database.executeQuery(`SELECT * FROM Releases WHERE release_date >= date('now', '-30 day') OR match IS NULL`, username)
    .then(function(releases) {
        releases.forEach(release => {

            // Use like to select case insensitive
            database.executeQuery(`select * from artist where name LIKE ?  AND id in (
                                select artist_id from Scrobble
                                group by artist_id
                                HAVING count(*) > 50
                                )`, username, [release.artist]).then(function (result) {
                database.executeQuery(`UPDATE Releases SET Match = ? WHERE id = ?`, username, [
                    (result.length ? 1 : 0),
                    release.id
                ]).catch(function (ex) {
                    logger.log(logger.ERROR, `Error saving match`, ex);
                })
            }).catch(function (ex) {
                logger.log(logger.ERROR, `Error trying to match`, ex);
            })
        });
    }).catch(function (ex) {
        logger.log(logger.ERROR, `Error getting releases to match`, ex);
    })
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

                spotify_helper.getValue('username', username).then(function (spotify_username) {
                    if (spotify_username && spotify_username.length) {
                        // Download and save the new releases
                        updateNewReleases(username);
                        // Remove old non-matches
                        cleanupReleases(username);
                        // A bit arbitrary, but wait for a bit before processing the releases
                        setTimeout(saveMatches, 30000, username);
                    }
                });
            }
        } catch (ex) {
            logger.log(logger.ERROR, `spotify releases`, ex);
        }
    },
}
