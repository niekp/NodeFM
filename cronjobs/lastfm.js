var database = require('../db.js')
const sqlite3 = require('sqlite3');
const config = require('config');
const fs = require('fs');
const LastFm = require("lastfm-node-client");
const crypto = require('crypto');

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
		}).catch(function(ex) {
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
	database.executeQuery(`SELECT ${key} FROM status`, username).then(function(result) {
		if (!result.length) {
			database.executeQuery(`INSERT INTO status (${key}) VALUES (?)`, username, [
				value
			]).catch(function (ex) {
				console.error(error);
			});
		} else {
			database.executeQuery(`UPDATE status SET ${key} = ?`, username, [
				value
			]).catch(function (error) {
				console.error(error);
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

let lastSync = 0;
let pagenumber = 1;

// Keep the start timestamp of the sync. If the sync is done, save this as the startpoint for the next sync.
// Get the time 10 minutes before the sync so we don't miss scrobbles.
startSync = new Date().getTime() - (10 * 60 * 1000);

function setupVariables(username) {
	return new Promise((resolve, reject) => {
		
		// Get the timestamp of the last sync
		p1 = new Promise((resolve, reject) => {
			getStatus('lastsync', username).then(function (result) {
				if (!result) {
					result = 0;
				}
				
				lastSync = result;

				// If this is the first run, don't set the syncdate to now but to the last scrobble. That way we don't miss stuff if the first sync takes a couple of days
				if (lastSync == 0) {
					getLastScrobbleTimestamp(username).then(function(timestamp) {
						startSync = timestamp;
						resolve();
					}).catch(function(ex) {
						reject(ex);
					});
				} else {
					resolve();
				}
			}).catch(function(ex) {
				reject(ex);
			});
		});

		p2 = getStatus('page', username).then(function (result) {
			if (!result) {
				result = 1;
			}
			pagenumber = result;
		});
		

		Promise.all([p1, p2]).then(function () {
			resolve();
		}).catch(function(ex) {
			reject(ex);
		});
	});
}

function getPage(username, pagenumber, lastSync) {
	return lastFm.userGetRecentTracks({
		"user": username,
		"page": pagenumber,
		"from": Math.round(lastSync / 1000),
		"limit": limit,
		"format": "json"
	})
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
					database.executeQuery('SELECT last_insert_rowid() AS id', username).then(function (data) {
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
					database.executeQuery('SELECT last_insert_rowid() AS id', username).then(function (data) {
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
					database.executeQuery('SELECT last_insert_rowid() AS id', username).then(function (data) {
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


async function parsePage(username, page) {
	let changesDetected = false;

	for (const track of page["recenttracks"]["track"]) {
		await (new Promise((resolve, reject) => {
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
			let track = track['name']
			let track_mbid = track['mbid']
			if (!track_mbid)
				track_mbid = null;

			// track["artist"]["mbid"]
			getArtistId(username, artist, artist_mbid).then(function (artist_id) {
				getAlbumId(username, artist_id, album, album_mbid).then(function (album_id) {
					getTrackId(username, artist_id, album_id, track, track_mbid).then(function (track_id) {

						// Insert scrobble..
						//		timestamp = track["date"]["uts"]


						resolve();

					}).catch(function (ex) {
						reject('Error getting track id: ' + ex);
					})

				}).catch(function(ex) {
					reject('Error getting album id: ' + ex);
				})

			}).catch(function(ex) {
				reject('Error getting artist id: ' + ex);
			});
		}));
	}
}

function recursiveSync(username, pagenumber) {
	getPage(username, pagenumber).then(function (result) {
		let stop = false;

		if (!('recenttracks' in result)) {
			stop = true;
			console.error('Incorrect response', result);
			throw 'Incorrect response.';
		}

		// Get the totalPages from the result metadata for comparison if all results are in.
		let totalPages = parseInt(result['recenttracks']['@attr']['totalPages']);
		
		// Print progress
		if ((limit * totalPages) > 300) {
			console.log(username, ': ', pagenumber, ' / ', totalPages);
		}

		console.log('Total pages:', totalPages);

		parsePage(username, result).then(function () {
			console.log('Page done.')
			if (pagenumber >= totalPages) {
				// Save the time of the sync as startpoint for the next sync
				setStatus("lastsync", startSync, username)
				setStatus("page", 1, username)

				stop = true;
			} else {
				setStatus("page", pagenumber, username)
			}
			

			stop = true;

			if (!stop) {
				pagenumber++;
				recursiveSync(username, pagenumber);
			}


		}).catch(function (ex) {
			stop = true;
			console.error('Error parsing page:' + ex);
			throw 'Error parsing page';
		});

	}).catch(function(ex) {
		console.error('Error getting page', ex);
	})
}

function syncLastFm(username) {
	setupVariables(username).then(function() {
		recursiveSync(username, pagenumber);
	});
}

module.exports = {
	run: function () {
		if (!lastFm) {
			console.error('Last.fm API-key not found');
			return;
		}

		// Loop through all users
		fs.readdir(database_folder, function (error, files) {
			if (error) {
				return console.error('Unable to scan users: ' + error);
			}

			files.forEach(function (user_file) {
				let username = '';
				if (user_file.indexOf('.db') > 0) {
					username = user_file.replace('.db', '');
				}
				if (username) {
					database.connect(username, sqlite3.OPEN_READWRITE).then(function () {
						
						syncLastFm(username);

					}).catch(function (error) {
						console.error(error);
					});

				}
			});
		});
	},
}

module.exports.run();