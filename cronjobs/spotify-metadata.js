var database = require('../db.js')
const spotify = require('../models/spotify.js');
const spotify_helper = require('../models/spotify_helper.js');
var SpotifyWebApi = require('spotify-web-api-node');
var helper = require('./helper.js');
var logger = require('../models/logger.js');

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
async function saveAlbum(data, username, album_id) {
	let release_date = data.release_date;
	if (data.release_date_precision == 'year') {
		release_date += '-01-01';
	} else if (data.release_date_precision == 'month') {
		release_date += '-01';
	}

	logger.log(logger.INFO, `Spotify - ${username} - save metadata ${album_id}`);

	// Save the images
	if ('images' in data) {
		await database.executeQuery(`DELETE FROM Images 
					WHERE source = 'spotify' AND type = 'album' AND link_id = ?`, username,
			[album_id]);

		for (let img of data.images) {
			await database.executeQuery(`INSERT INTO Images (source, type, link_id, url, key)
					VALUES (?, ?, ?, ?, ?)`, username, [
					'spotify',
					'album',
					album_id,
					img.url,
					(img.width + 'x' + img.height)
				]);
		}
	}

	await database.executeQuery(`UPDATE Album SET 
		spotify_uri = ?,
		spotify_id = ?,
		type = ?,
		release_date = ?,
		total_tracks = ?,
		spotify_last_search = datetime('now') 
		WHERE id = ?`, username, [
			data.uri,
			data.id,
			data.album_type,
			release_date,
			data.total_tracks,
			album_id
		]
	);

	return true;
}

/**
 * Save the artist to the DB
 * @param {JSON} body The API result
 * @param {string} username 
 */
function saveArtist(data, username, artist_id) {
	logger.log(logger.INFO, `Spotify - ${username} - save artist ${artist_id}`);

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

function getExceptionMsg(ex) {
	let msg;
	if (ex && typeof (ex) == 'object' && ex.message) {
		msg = ex.message;
	} else {
		msg = ex;
	}
	return msg;
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
				spotify.getAlbum(api, album_data.id).then(function (album_data_extended) {
					body = album_data_extended.body;
					promises.push(saveAlbum(body, username, album_id));
					if (body.artists[0]) {
						promises.push(saveArtist(body, username, artist_id));
					}

				}).catch(function (ex) {
					reject(ex);
				});
			} else {
				promises.push(database.executeQuery(`UPDATE Album SET 
						spotify_last_search = datetime('now')
						WHERE id = ?`, username, [
						album_id
					]
				));
			}
			
		}).catch(function (ex) {
			let msg = getExceptionMsg(ex);

			// Don't search for a while.
			// Also the 'Bad Gateway' error is persistent and i can't find a good reason, so mark the album as done for now
			if (msg.indexOf('No results') >= 0 || msg.indexOf('Bad Gateway') >= 0) {
				promises.push(database.executeQuery(`UPDATE Album SET 
					spotify_last_search = datetime('now')
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

async function getArtistSpotifyId(api, artist) {
	if (artist.spotify_id) {
		return artist.spotify_id;
	}

	try {
		let search_result = await spotify.getSearchResult(api, 'artist', artist);
		if (Object.keys(search_result).length) {
			return search_result.id;
		}
	} catch (ex) {
		logger.log(logger.ERROR, `Error getting artist spotify ID: ${artist.name}`, ex);
		throw 'Error getting artist spotify ID';
	}

	return;
}

async function getArtist(api, username, artist) {
	try {
		let id = await getArtistSpotifyId(api, artist);
		if (!id) {
			await database.executeQuery(`UPDATE Artist SET 
					spotify_last_search = datetime('now')
					WHERE id = ?`, username, [
					artist.id
				]
			);
			return;
		}
		
		let artist_data = await spotify.getArtist(api, id);
		if (!artist_data) {
			return;
		}
		
		artist_data = artist_data.body;
		
		await database.executeQuery(`UPDATE Artist SET 
					spotify_uri = ?,
					spotify_id = ?,
					spotify_last_search = datetime('now')
					WHERE id = ?`, username, [
						artist_data.uri,
						artist_data.id,
						artist.id
			]
		);
		
		// Save the images
		if ('images' in artist_data) {
			await database.executeQuery(`DELETE FROM Images 
					WHERE source = 'spotify' AND type = 'artist' AND link_id = ?`, username,
				[artist.id]);

			for (let img of artist_data.images) {
				await database.executeQuery(`INSERT INTO Images (source, type, link_id, url, key)
					VALUES (?, ?, ?, ?, ?)`, username, [
						'spotify',
						'artist',
						artist.id,
						img.url,
						(img.width + 'x' + img.height)
					]);
			}
		}


	} catch (ex) {
		logger.log(logger.ERROR, `Error getting artist: ${artist.name}`, ex);
	}
}

var timeouts = [];
function clearTimeouts() {
	timeouts.forEach(function(timeout) {
		clearTimeout(timeout);
	});
	timeouts = [];
}

/**
 * Call the get and save release functions for all pages
 * @param {string} username 
 */
function fillSpotifyMetadata(username) {
	return new Promise((resolve, reject) => {
		let timeout = 1000,
			total = 1000,
			done = 0,
			errors = 0,
			canceled = false;
		
		database.executeQuery(`SELECT Album.id as album_id, 
									Album.name AS album, 
									Artist.id AS artist_id,
									Artist.name AS artist
									FROM Album 
									INNER JOIN Artist ON Artist.id = Album.artist_id 
									WHERE Album.spotify_last_search IS NULL
									LIMIT 0, ${total}`, username
		).then(function (albums) {
			albums.forEach(album => {
				timeouts.push(setTimeout(function () {
					if (!canceled) {
						spotify.getApi(username).then(function (api) {
							logger.log(logger.INFO, `Spotify - ${username} - get metadata ${album.artist} - ${album.album}`);

							getAlbum(api, username, album.artist, album.album, album.artist_id, album.album_id).catch(function (ex) {
								errors++;
								logger.log(logger.ERROR, `Spotify - error getting abum ${album.artist} - ${album.album}`, ex);
								let msg = getExceptionMsg(ex);

								if (msg.indexOf('Too Many Requests') >= 0) {
									canceled = true;
									clearTimeouts();
									reject('Too many requests. Stopping.')
								}
								
								if (errors > 3) {
									clearTimeouts();
									canceled = true;
									reject('Too many errors, stopping');
									return;
								}
							});
						}).catch(function(ex) {
							errors++;
							canceled = true;
							reject('Error getting spotify API. Canceling job' + ex);
						})
					}

					done++;
					if (done >= total || canceled) {
						resolve();
					}
				}, timeout));
				timeout += 2000;
			})

		}).then(function() {
			clearTimeouts();
			timeout = 1000;
			total = 1000;
			done = 0;
			errors = 0;

			if (canceled) {
				resolve();
				return;
			}

			database.executeQuery(`SELECT * FROM Artist WHERE spotify_last_search IS NULL
									LIMIT 0, ${total}`, username
			).then(function (artists) {
				artists.forEach(artist => {
					timeouts.push(setTimeout(function () {
						if (!canceled) {
							spotify.getApi(username).then(function (api) {
								logger.log(logger.INFO, `Spotify - ${username} - get metadata ${artist.name}`);

								getArtist(api, username, artist).catch(function (ex) {
									errors++;
									logger.log(logger.ERROR, `Spotify - error getting artist ${artist.name}`, ex);
									let msg = getExceptionMsg(ex);

									if (msg.indexOf('Too Many Requests') >= 0) {
										canceled = true;
										clearTimeouts();
										reject('Too many requests. Stopping.')
									}

									if (errors > 3) {
										clearTimeouts();
										canceled = true;
										reject('Too many errors, stopping');
										return;
									}
								});
							}).catch(function (ex) {
								errors++;
								canceled = true;
								reject('Error getting spotify API. Canceling job' + ex);
							})
						}

						done++;
						if (done >= total || canceled) {
							resolve();
						}
					}, timeout));
					timeout += 2000;
				})
			});
		})
	});
}

var running = false;

module.exports = {
	isRunning: function () {
		return running;
	},

	run: async function () {
		running = true;
		clearTimeouts();

		try {
			users = await helper.getUsers();
			for (username of users) {
				await helper.connect(username);
				
				let spotify_username = await spotify_helper.getValue('username', username);

				if (spotify_username && spotify_username.length) {
					logger.log(logger.INFO, `Spotify - start getting metadata ${username}`);

					fillSpotifyMetadata(username).then(function () {
						running = false;
					}).catch(function (ex) {
						logger.log(logger.ERROR, `Spotify - done with errors`, ex);
						running = false;
					});
				}
			}
		} catch (ex) {
			logger.log(logger.ERROR, `Spotify metadata`, ex);
		}
	},
}
