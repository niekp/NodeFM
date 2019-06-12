var database = require('../db.js')
const sqlite3 = require('sqlite3');
const config = require('config');
const fs = require('fs');
const LastFm = require("lastfm-node-client");

let database_folder = config.get('database_folder');

if (database_folder.substr(0, database_folder - 1) !== '/') {
    database_folder += '/';
}

var lastFm = null;
if (apikey = config.get('lastfm_apikey')) {
    lastFm = new LastFm({
        "apiKey": config.get('lastfm_apikey')
    });
}

const limit = 20;

// Variables per username
var running = [],
    lastSync = [],
    pagenumber = [],
    startSync = [],
    big_sync = [];

/**
 * Get a value from the status table
 * @param {string} key 
 * @param {string} username 
 * @see setValue
 */
function getStatus(key, username) {
    return new Promise((resolve, reject) => {
        database.executeQuery(`SELECT ${key} FROM status`, username).then(function (result) {
            if (result.length == 0) {
                resolve();
            } else {
                resolve(result ? eval('result[0].' + key) : '');
            }
        }).catch(function (ex) {
            reject(ex);
        })
    });
}

/**
 * Set a value to the spotify settings table
 * @param {string} key 
 * @param {string} value 
 * @param {string} username 
 * @see getValue
 */
function setStatus(key, value, username) {
    database.executeQuery(`SELECT ${key} FROM status`, username).then(function (result) {
        if (!result.length) {
            database.executeQuery(`INSERT INTO status (${key}) VALUES (?)`, username, [
                value
            ]).catch(function (ex) {
                console.error(ex.stack);
            });
        } else {
            database.executeQuery(`UPDATE status SET ${key} = ?`, username, [
                value
            ]).catch(function (error) {
                console.error(error.stack);
            });
        }
    });
}

function getLastScrobbleTimestamp(username) {
    return new Promise((resolve, reject) => {
        database.executeQuery(`SELECT utc FROM Scrobble ORDER BY utc DESC LIMIT 0, 1`, username).then(function (result) {
            if (result.length == 0) {
                resolve(0);
            } else {
                resolve(result[0].utc);
            }
        }).catch(function (ex) {
            reject(ex);
        })
    });
}

function setupVariables(username) {
    return new Promise((resolve, reject) => {
        // Keep the start timestamp of the sync. If the sync is done, save this as the startpoint for the next sync.
        // Get the time 10 minutes before the sync so we don't miss scrobbles.
        startSync[username] = Math.round(new Date().getTime() / 1000) - (10 * 60);
        big_sync[username] = false;

        // Get the timestamp of the last sync
        p1 = new Promise((resolve, reject) => {
            getStatus('lastsync', username).then(function (result) {
                if (!result) {
                    result = 0;
                }

                lastSync[username] = result;

                // If this is the first run, don't set the syncdate to now but to the last scrobble. That way we don't miss stuff if the first sync takes a couple of days
                if (lastSync[username] == 0) {
                    getLastScrobbleTimestamp(username).then(function (timestamp) {
                        startSync[username] = timestamp;
                        resolve();
                    }).catch(function (ex) {
                        reject(ex);
                    });
                } else {
                    resolve();
                }
            }).catch(function (ex) {
                reject(ex);
            });
        });

        p2 = getStatus('page', username).then(function (result) {
            if (!result) {
                result = 1;
            }
            pagenumber[username] = result;
        });


        Promise.all([p1, p2]).then(function () {
            resolve();
        }).catch(function (ex) {
            reject(ex);
        });
    });
}

function getPage(username, pagenumber) {
    return lastFm.userGetRecentTracks({
        "user": username,
        "page": pagenumber,
        "from": lastSync[username],
        "limit": limit,
        "format": "json"
    })
}

function resetSyncDate(username, table, id) {
    database.executeQuery(`UPDATE ${table} SET spotify_last_search = NULL, lastfm_last_search = NULL WHERE id = ${id}`, username);
}

function getArtistId(username, artist, artist_mbid) {
    return new Promise((resolve, reject) => {
        // Lookup existing ID
        database.executeQuery('SELECT id FROM Artist WHERE name = ?', username, [artist]).then(function (data) {
            if (data.length) {
                resolve(data[0].id);
            } else {
                // Add new artist
                database.executeQuery('INSERT INTO Artist (name, mbid) VALUES (?, ?)', username, [artist, artist_mbid]).then(function () {
                    database.executeQuery('SELECT id FROM Artist WHERE name = ?', username, [artist]).then(function (data) {
                        resolve(data[0].id);
                    }).catch(function (ex) {
                        reject('Error getting artist last_inserted_rowid: ' + ex);
                    });
                }).catch(function (ex) {
                    reject('Error inserting artist: ' + ex);
                });
            }
        });
    });
}

function getAlbumId(username, artist_id, album, album_mbid) {
    return new Promise((resolve, reject) => {
        // Lookup existing ID
        database.executeQuery('SELECT id FROM Album WHERE artist_id = ? AND name = ?', username, [artist_id, album]).then(function (data) {
            if (data.length) {
                resolve(data[0].id);
            } else {
                // Add new album
                database.executeQuery('INSERT INTO Album (artist_id, name, mbid) VALUES (?, ?, ?)', username, [artist_id, album, album_mbid]).then(function () {
                    database.executeQuery('SELECT id FROM Album WHERE artist_id = ? AND name = ?', username, [artist_id, album]).then(function (data) {
                        resetSyncDate(username, 'artist', artist_id);
                        resolve(data[0].id);
                    }).catch(function (ex) {
                        reject('Error getting album last_inserted_rowid: ' + ex);
                    });
                }).catch(function (ex) {
                    reject('Error inserting album: ' + ex);
                });
            }
        });
    });
}

function getTrackId(username, artist_id, album_id, track, track_mbid) {
    return new Promise((resolve, reject) => {
        // Lookup existing ID
        database.executeQuery('SELECT id FROM Track WHERE artist_id = ? AND album_id = ? AND name = ?', username, [artist_id, album_id, track]).then(function (data) {
            if (data.length) {
                resolve(data[0].id);
            } else {
                // Add new track
                database.executeQuery('INSERT INTO Track (artist_id, album_id, name, mbid) VALUES (?, ?, ?, ?)', username, [artist_id, album_id, track, track_mbid]).then(function () {
                    database.executeQuery('SELECT id FROM Track WHERE artist_id = ? AND album_id = ? AND name = ?', username, [artist_id, album_id, track]).then(function (data) {
                        resetSyncDate(username, 'artist', artist_id);
                        resetSyncDate(username, 'album', album_id);

                        resolve(data[0].id);
                    }).catch(function (ex) {
                        reject('Error getting track last_inserted_rowid: ' + ex);
                    });
                }).catch(function (ex) {
                    reject('Error inserting track: ' + ex);
                });
            }
        });
    });
}

function scrobbleTrack(username, artist_id, album_id, track_id, timestamp) {
    return new Promise((resolve, reject) => {
        // Lookup existing ID
        database.executeQuery('SELECT id FROM Scrobble WHERE track_id = ? AND utc = ?', username, [track_id, timestamp]).then(function (data) {
            if (!data.length) {

                // Add new scrobble
                database.executeQuery('INSERT INTO Scrobble (utc, track_id, artist_id, album_id) VALUES (?, ?, ?, ?)', username, [
                    timestamp, track_id, artist_id, album_id]).then(function () {
                        resolve(true);
                    }).catch(function (ex) {
                        reject('Error inserting scrobble: ' + ex);
                    });
            } else {
                resolve(false);
            }
        });
    });
}

function scrobbleLastFmTrack(username, track) {
    return new Promise((resolve, reject) => {
        // If there is currently music playing, this will get added to every page.So skip that record.
        if ("@attr" in track && "nowplaying" in track["@attr"] && track["@attr"]["nowplaying"] == "true") {
            resolve();
        }

        // Artist
        let artist = track['artist']['#text'];
        let artist_mbid = track['artist']['mbid'];
        if (!artist_mbid)
            artist_mbid = null;

        // Album
        let album = track['album']['#text'];
        let album_mbid = track['album']['mbid'];
        if (!album_mbid)
            album_mbid = null;

        // Track
        let title = track['name']
        let timestamp = track['date']['uts']
        let track_mbid = track['mbid']
        if (!track_mbid)
            track_mbid = null;

        getArtistId(username, artist, artist_mbid).then(function (artist_id) {
            getAlbumId(username, artist_id, album, album_mbid).then(function (album_id) {
                getTrackId(username, artist_id, album_id, title, track_mbid).then(function (track_id) {

                    scrobbleTrack(username, artist_id, album_id, track_id, timestamp).then(function (changes) {
                        resolve(changes);

                    }).catch(function (ex) {
                        reject('Error inserting scrobble: ' + ex);
                    })


                }).catch(function (ex) {
                    reject('Error getting track id: ' + ex);
                })

            }).catch(function (ex) {
                reject('Error getting album id: ' + ex);
            })

        }).catch(function (ex) {
            reject('Error getting artist id: ' + ex);
        });
    });
}


const isIterable = object =>
    object != null && typeof object[Symbol.iterator] === 'function'

async function parsePage(username, page) {
    let changesDetected = false;

    if (!page['recenttracks'] || !page['recenttracks']['track'] || !isIterable(page['recenttracks']['track'])) {
        throw 'Invalid page: ' + page;
    }

    try {
        for (const track of page["recenttracks"]["track"]) {
            await scrobbleLastFmTrack(username, track).then(function (changes) {
                if (changes) {
                    changesDetected = true;
                }
            });
        }
    } catch (ex) {
        throw ex;
    }

    return changesDetected;
}


function recursiveSync(username, pagenumber) {
    getPage(username, pagenumber).then(function (result) {
        let stop = false;

        if (!('recenttracks' in result)) {
            stop = true;
            running[username] = false;
            console.error('Incorrect response', result);
            throw 'Incorrect response.';
        }

        // Get the totalPages from the result metadata for comparison if all results are in.
        let totalPages = parseInt(result['recenttracks']['@attr']['totalPages']);

        // Print progress
        if ((limit * totalPages) > 300) {
            big_sync[username] = true;
            console.log(username, ': ', pagenumber, ' / ', totalPages);
        }

        if (!stop) {
            parsePage(username, result).then(function (changes) {

                if (pagenumber >= totalPages) {
                    // Save the time of the sync as startpoint for the next sync
                    setStatus("lastsync", startSync[username], username)
                    setStatus("page", 1, username)

                    stop = true;
                    running[username] = false;

                    // If this was a big sync, reset the cronjobs so they run again.
                    if (big_sync[username]) {
                        database.executeQuery('DELETE FROM Cronjob', username);
                    }
                } else {
                    setStatus("page", pagenumber, username)
                }

                if (!stop) {
                    pagenumber++;
                    recursiveSync(username, pagenumber);
                }

            }).catch(function (ex) {
                stop = true;
                running[username] = false;
                console.error('Error parsing page:' + ex.stack);
                throw 'Error parsing page';
            });
        }

    }).catch(function (ex) {
        running[username] = false;
        console.error('Error getting page', ex.stack);
    })
}


module.exports = {
    syncLastFm: function(username) {
        if (!running[username]) {
            if (!lastFm) {
                console.error('Last.fm API-key not found');
                return;
            }
            running[username] = true;

            database.connect(username, sqlite3.OPEN_READWRITE).then(function () {
                try {
                    setupVariables(username).then(function () {
                        recursiveSync(username, pagenumber[username]);
                    }).catch(function (ex) {
                        running[username] = false;
                        console.error(ex.stack);
                    })
                } catch (ex) {
                    running[username] = false;
                    console.error(ex.stack);
                }
                
            }).catch(function (error) {
                running[username] = false;
                console.error(error.stack);
            });

        }
    }
}
