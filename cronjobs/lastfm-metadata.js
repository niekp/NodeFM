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

async function saveTrackData(username, album, track) {
	return new Promise((resolve, reject) => {

		database.executeQuery(`UPDATE Track SET 
					lastfm_last_search = datetime('now'),
					duration = ?,
					track_number = ?,
					mbid = ?
					WHERE album_id = ? AND artist_id = ? AND name = ?`, username, [
				track.duration,
				track['@attr']['rank'],
				track.mbid,
				album.album_id,
				album.artist_id,
				track.name
			]
		).then(function() {
			resolve();
		}).catch(function(ex) {
			reject(ex);
		})
	});
}

async function parseAlbum(username, album) {
	data = await lastFm.albumGetInfo({
		"artist": album.artist,
		"album": album.album,
		"autocorrect": 1
	});

	if ('album' in data) {
		let image = '';

		// Get the image
		if ('image' in data.album) {
			data.album.image.forEach(function (img) {
				if (img['#text'].indexOf('300x300') >= 0) {
					image = img['#text'];
				}
			})

			if (!image) {
				image = data.album.image.pop()['#text'];
			}
		}

		await database.executeQuery(`UPDATE Album SET 
			lastfm_last_search = datetime('now'),
			image = ?,
			total_tracks = ?,
			mbid = ?
			WHERE id = ?`, username, [
				image,
				('tracks' in data.album ? data.album['tracks']['track'].length : null),
				(data.mbid ? data.mbid : album.mbid),
				album.album_id
			]
		);

		if ('tracks' in data.album) {
			for (const track of data.album['tracks']['track']) {
				await saveTrackData(username, album, track);
			}
		}
	}
}

/**
 * Call the get and save release functions for all pages
 * @param {string} username 
 */
async function fillMetadata(username) {
	let total = 10;

	try {
		albums = await database.executeQuery(`SELECT Album.id as album_id, 
					Album.name AS album, 
					Artist.id AS artist_id,
					Artist.name AS artist,
					Album.mbid
					FROM Album 
					INNER JOIN Artist ON Artist.id = Album.artist_id 
					WHERE Album.lastfm_last_search IS NULL
					LIMIT 0, 1`, username
		);

		for (const album of albums) {
			await parseAlbum(username, album);
		}

	} catch (ex) {
		console.error(ex);
		running[username] = false;
	}
}

// Running status per user
let running = [];

module.exports = {
	run: function () {
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

					if (!running[username]) {
						if (!lastFm) {
							console.error('Last.fm API-key not found');
							return;
						}
						running[username] = true;

						database.connect(username, sqlite3.OPEN_READWRITE).then(function () {
							fillMetadata(username).then(function () {
								running[username] = false;
							}).catch(function (ex) {
								console.error(ex.stack);
								running[username] = false;
							});
						}).catch(function(ex) {
							console.error(ex.stack);
							running[username] = false;
						});
					} else {
						console.log(username, 'Lastfm metadata already running');
					}


				}
			});
		});
	},
}
