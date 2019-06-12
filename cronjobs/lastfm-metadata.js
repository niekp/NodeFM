var database = require('../db.js')
const config = require('config');
const LastFm = require("lastfm-node-client");
var cache_helper = require('../models/cache_helper.js');
var helper = require('./helper.js');

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
	let cache_key = 'lastfm_' + album.artist + '_' + album.album;
	let cache_expire = cache_helper.getExpiresSeconds('month');
	let data;
	
	try {
		data = await cache_helper.get(cache_key);
	} catch (ex) {}

	if (!data) {
		data = await lastFm.albumGetInfo({
			"artist": album.artist,
			"album": album.album,
			"autocorrect": 1
		});

		cache_helper.save(cache_key, data, cache_expire, 'json');
	}

	if ('album' in data) {

		// Save the images
		if ('image' in data.album && data.album.image.length > 0) {

			await database.executeQuery(`DELETE FROM Images 
					WHERE source = 'lastfm' AND type = 'album' AND link_id = ?`, username,
				[album.album_id]);

			for (let img of data.album.image) {

				await database.executeQuery(`INSERT INTO Images (source, type, link_id, url, key)
					VALUES (?, ?, ?, ?, ?)`, username, [
						'lastfm',
						'album',
						album.album_id,
						img['#text'],
						img['size']
					]);
			}
		}

		await database.executeQuery(`UPDATE Album SET 
			lastfm_last_search = datetime('now'),
			total_tracks = ?,
			mbid = ?
			WHERE id = ?`, username, [
				('tracks' in data.album ? data.album['tracks']['track'].length : null),
				(data.mbid ? data.mbid : album.mbid),
				album.album_id
			]
		);

		if (data.album && 'tracks' in data.album) {
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
	let total = 500;

	try {
		albums = await database.executeQuery(`SELECT Album.id as album_id, 
					Album.name AS album, 
					Artist.id AS artist_id,
					Artist.name AS artist,
					Album.mbid
					FROM Album 
					INNER JOIN Artist ON Artist.id = Album.artist_id 
					WHERE Album.lastfm_last_search IS NULL
					LIMIT 0, ${total}`, username
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
	run: async function () {
		try {
			users = await helper.getUsers();
			for (username of users) {
				if (!running[username]) {
					if (!lastFm) {
						console.error('Last.fm API-key not found');
						return;
					}
					running[username] = true;

					await helper.connect(user);

					fillMetadata(username).then(function () {
						running[username] = false;
					}).catch(function (ex) {
						console.error(ex.stack);
						running[username] = false;
					});

				} else {
					console.log(username, 'Lastfm metadata already running');
				}
			}
		} catch (ex) {
			running[username] = [];			
			console.error('lastfm-metadata', ex);
		}
	},
}
