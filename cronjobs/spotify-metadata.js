var database = require('../db.js')
const sqlite3 = require('sqlite3');
const config = require('config');
const fs = require('fs');
const spotify = require('../models/spotify.js');
const spotify_helper = require('../models/spotify_helper.js');
var SpotifyWebApi = require('spotify-web-api-node');

let database_folder = config.get('database_folder');

if (database_folder.substr(0, database_folder - 1) !== '/') {
	database_folder += '/';
}

function getPromiseTimeout(ms){
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			resolve();
		}, ms)
	})
}

/**
 * Save the album to the DB
 * @param {JSON} body The API result
 * @param {string} username 
 */
function saveAlbum(data, username, album_id) {
	let release_date = data.release_date;
	if (data.release_date_precision == 'year') {
		release_date += '-01-01';
	} else if (data.release_date_precision == 'month') {
		release_date += '-01';
	}

	return database.executeQuery(`UPDATE Album SET 
		spotify_uri = ?,
		spotify_id = ?,
		type = ?,
		release_date = ?,
		total_tracks = ?,
		image = ?,
		last_api_search = datetime('now') 
		WHERE id = ?`, username, [
			data.uri,
			data.id,
			data.album_type,
			release_date,
			data.total_tracks,
			(data.images[1] ? data.images[1].url : ''),
			album_id
		]
	);
}

/**
 * Save the artist to the DB
 * @param {JSON} body The API result
 * @param {string} username 
 */
function saveArtist(data, username, artist_id) {
	return database.executeQuery(`UPDATE Artist SET 
		spotify_uri = ?,
		spotify_id = ?
		WHERE id = ?`, username, [
			data.artists[0].uri,
			data.artists[0].id,
			artist_id
		]
	);
}

/**
 * Save the tracks to the DB
 * @param {JSON} body The API result
 * @param {string} username 
 */
function saveTracks(tracks, username, artist_id, album_id) {
	return new Promise((resolve, reject) => {
		let promises = [];
		
		promises.push(getPromiseTimeout(2000));
		database.executeQuery(`SELECT id, name FROM Track WHERE artist_id = ? AND album_id = ?`, username, [
			artist_id, album_id
		]).then(function(db_tracks) {
			db_tracks.forEach(db_track => {
				// Match each DB track with a spotify track
				tracks.forEach(track => {
					let normalized_name = normalize(track.name),
						normalized_db_name = normalize(db_track.name);
					
					// Fuzzy match the track
					if (normalized_name == normalized_db_name
						|| normalized_name.indexOf(normalized_db_name) >= 0
						|| normalized_db_name.indexOf(normalized_name) >= 0) {
						promises.push(database.executeQuery(`UPDATE Track SET 
							spotify_uri = ?,
							spotify_id = ?,
							milliseconds = ?,
							track_number = ?
							WHERE id = ?`, username, [
								track.uri,
								track.id,
								track.duration_ms,
								track.track_number,
								db_track.id
							]
						));
					}
					
				});

				promises.push(database.executeQuery(`UPDATE Track SET 
						last_api_search = datetime('now')
						WHERE id = ?`, username, [
						db_track.id
					]
				));

			});
		});

		Promise.all(promises).then(function() {
			resolve();
		}).catch(function (ex) {
			reject(ex);
		})
	});
}

/**
 * @var {string} text
 */
function normalize(text) {
	text = text.toLowerCase().trim();
	text = text.normalize('NFD').replace(/[\u0300-\u036f]/g, "")
	text = text.replace(/\W+/g, '');
	return text;
}

/**
 * Get the new releases from the spotify API
 * @param {SpotifyWebApi} api
 * @param {int} limit 
 * @param {int} offset 
 */
function getAlbum(api, username, artist, album, artist_id, album_id) {
	return new Promise((resolve, reject) => {
		let promises = [];
		promises.push(getPromiseTimeout(2000));

		spotify.getSearchResult(api, 'album', artist, album).then(function (album_data) {
			if (Object.keys(album_data).length) {
				api.getAlbum(album_data.id).then(function (album_data_extended) {

					body = album_data_extended.body;
					promises.push(saveAlbum(body, username, album_id));
					if (body.artists[0]) {
						promises.push(saveArtist(body, username, artist_id));
					}
					if (body.tracks.items) {
						promises.push(saveTracks(body.tracks.items, username, artist_id, album_id));						
					}

				}).catch(function (ex) {
					reject(ex);
				});
			} else {
				promises.push(database.executeQuery(`UPDATE Album SET 
						last_api_search = datetime('now')
						WHERE id = ?`, username, [
						album_id
					]
				));
			}
			

		}).catch(function (ex) {
			if (ex.indexOf('No results') >= 0) {
				promises.push(database.executeQuery(`UPDATE Album SET 
					last_api_search = datetime('now')
					WHERE id = ?`, username, [
						album_id
					]
				));
			} else {
				reject(ex);
			}
			
		});

		Promise.all(promises).then(function () {
			resolve();
		}).catch(function (ex) {
			reject(ex);
		});

	});
}

/**
 * Call the get and save release functions for all pages
 * @param {string} username 
 */
function fillSpotifyMetadata(username, api) {
	return new Promise((resolve, reject) => {
		let timeout = 1000;
		let total = 1000;
		let done = 0;

		database.executeQuery(`SELECT Album.id as album_id, 
									Album.name AS album, 
									Artist.id AS artist_id,
									Artist.name AS artist
									FROM Album 
									INNER JOIN Artist ON Artist.id = Album.artist_id 
									WHERE Album.last_api_search IS NULL 
									LIMIT 0, ${total}`, username
		).then(function (albums) {
			albums.forEach(album => {
				setTimeout(function () {
					getAlbum(api, username, album.artist, album.album, album.artist_id, album.album_id).catch(function (ex) {
						console.error('Error getting album: ', album.artist, album.album, ex)
					});
					done++;

					if (done >= total) {
						resolve();
					}
				}, timeout);
				timeout += 2000;
			})

		});
	});
}

var running = false;
module.exports = {
	isRunning: function () {
		return running;
	},

	run: function () {
		running = true;
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
// testing.. only run for 1 user.
				if (username.indexOf('nok') >= 0) {
					database.connect(username, sqlite3.OPEN_READWRITE).then(function () {
						spotify_helper.getValue('username', username).then(function (spotify_username) {
							if (spotify_username.length) {
								spotify.getApi(username).then(function (api) {
									fillSpotifyMetadata(username, api).then(function () {
										running = false;
										console.log('done!')
									})
								});
							}
						});

					}).catch(function (error) {
						console.error(error);
					});

				}
			});
		});
	},
}
