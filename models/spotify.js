const SpotifyWebApi = require('spotify-web-api-node');
const spotify_helper = require('./spotify_helper')
const cache_helper = require('./cache_helper');
const logger = require('./logger');

/**
 * Get the spotify API with token
 * @param {Request} req 
 * @param {Response} res 
 * @returns {Promise<SpotifyWebApi>}
 */
function getSpotifyApi(username) {
	return new Promise((resolve, reject) => {
		var spotifyApi = new SpotifyWebApi();
		spotify_helper.getToken(username).then(function (token) {
			spotifyApi.setAccessToken(token);
			resolve(spotifyApi);
		}).catch(function(ex) {
			reject(ex);
		});
	});
}

function encodeSpotify(str) {
	try {
		str = str.replace(/'/g, '');		
	} catch (ex) {
		logger.log(logger.WARN, `Spotify search string could not be encoded: ${str}, type: ${typeof(str)}`);
	}

	return str;
}

/**
 * Build a spotify search query
 * @param {string} artist 
 * @param {string} album 
 * @param {string} track 
 */
function getSearchQuery(artist, album, track) {
	let query = '';
	if (artist)
		query += 'artist:' + encodeSpotify(artist) + ' ';
	if (album)
		query += 'album:' + encodeSpotify(album) + ' ';
	if (track)
		query += 'track:' + encodeSpotify(track) + ' ';

	return query.trim();
}



/**
 * The layer to extract the relevant now_playing info.
 * @todo Save artist image and ID data for future use.
 * @param {JSON} now_playing 
 * @param {string} username 
 */
function getNowPlaying(now_playing, username) {
	if (Object.keys(now_playing).length) {
		let progress = now_playing.progress_ms;
		let duration = now_playing.item.duration_ms;

		let album = now_playing.item.album.name;
		let album_image = now_playing.item.album.images;
		let artist = now_playing.item.artists[0].name;
		let track = now_playing.item.name;

		let data = JSON.stringify({
			artist: artist,
			album: album,
			track: track,
			image: album_image[1].url,
			duration: duration,
			timestamp: (new Date().getTime()),
			progress: progress
		});

		return data;
	} else {
		return {};
	}
}

var self = module.exports = {
	/**
	 * Get the filter
	 */
	getFilter: function (req) {
		return (req.cookies['filter'] ? JSON.parse(req.cookies['filter']) : {});
	},

	/**
	 * Get the first search result
	 * @param {SpotifyWebApi} api 
	 * @param {string} type - track, album, artist
	 * @param {string} artist 
	 * @param {string} album 
	 * @param {string} track 
	 * @returns {Promise<Object>} Return the web response
	 */
	getSearchResult: function(api, type, artist, album, track) {
		return new Promise((resolve, reject) => {

			let cache_key = type + '_' + getSearchQuery(artist, album, track);
			let cache_expire = cache_helper.getExpiresSeconds('month');

			cache_helper.get(cache_key).then(function (result) {
				resolve(result);
			}).catch(function () {
				// Search track
				if (type == 'track') {
					api.searchTracks(getSearchQuery(artist, null, track), { limit: 1 }).then(function (results) {
						if ((tracks = results.body.tracks.items) && tracks.length > 0) {
							cache_helper.save(cache_key, tracks[0], cache_expire, 'json');
							resolve(tracks[0]);
						} else {
							reject('No results');
						}
					}).catch(function (ex) {
						reject(ex);
					})
				} else if (type == 'album') {
					api.searchAlbums(getSearchQuery(artist, album), { limit: 1 }).then(function (results) {
						if ((albums = results.body.albums.items) && albums.length > 0) {
							cache_helper.save(cache_key, albums[0], cache_expire, 'json');
							resolve(albums[0]);
						} else {
							reject('No results');
						}
					}).catch(function (ex) {
						reject(ex);
					})
				} else if (type == 'artist') {
					api.searchArtists(getSearchQuery(artist), { limit: 1 }).then(function (results) {
						if ((artist = results.body.artists.items) && artist.length > 0) {
							cache_helper.save(cache_key, artist[0], cache_expire, 'json');
							resolve(artist[0]);
						} else {
							reject('No results');
						}
					}).catch(function (ex) {
						reject(ex);
					})
				}
			});
		});
	},

	getAlbum: async function (api, id) {
		let cache_key = 'spotify_album_' + id;
		let cache_expire = cache_helper.getExpiresSeconds('month');
		let data;

		try {
			data = await cache_helper.get(cache_key);
		} catch (ex) { }

		if (!data) {
			try {
				data = await api.getAlbum(id);
				cache_helper.save(cache_key, data, cache_expire, 'json');
			} catch (ex) {
				throw ex;
			}
		}

		return data;
	},

	getArtist: async function (api, id) {
		let cache_key = 'spotify_artist_' + id;
		let cache_expire = cache_helper.getExpiresSeconds('month');
		let data;

		try {
			data = await cache_helper.get(cache_key);
		} catch (ex) { }

		if (!data) {
			try {
				data = await api.getArtist(id);
				cache_helper.save(cache_key, data, cache_expire, 'json');
			} catch (ex) {
				throw ex;
			}
		}

		return data;
	},

	/**
	 * Get the spotify API
	 * @param {string} username 
	 * @returns {Promise<SpotifyWebApi>}
	 */
	getApi: function(username) {
		return getSpotifyApi(username);
	},

	nowplaying: function(username) {
		return new Promise((resolve, reject) => {
			// First get the result from the DB
			getSpotifyApi(username).then(function (api) {
				api.getMyCurrentPlayingTrack().then(function (now_playing) {
					resolve(getNowPlaying(now_playing.body, username));
				}).catch(function (ex) {
					reject(ex);
				});
			}).catch(function (ex) {
				reject(ex);
			})
		});
	},

	/**
	 * Skip the current song
	 * @param {Request} req 
	 * @param {Response} res 
	 */
	next: function (req, res) {
		getSpotifyApi(res.locals.username).then(function (api) {
			api.skipToNext().catch(function(ex) {
				logger.log(logger.ERROR, `Error skip to next`, ex);
			});
		}).catch(function (ex) {
			logger.log(logger.ERROR, `Error getting spotify API`, ex);
		});
	},

	/**
	 * Skip the current song
	 * @param {Request} req 
	 * @param {Response} res 
	 */
	prev: function (req, res) {
		getSpotifyApi(res.locals.username).then(function (api) {
			api.skipToPrevious().catch(function (ex) {
				logger.log(logger.ERROR, `Error skip to previous`, ex);
			});
		}).catch(function (ex) {
			logger.log(logger.ERROR, `Error getting spotify API`, ex);
		});
	},

	/**
	 * Play a track, album or artist
	 * @param {Request} req - search with ?type=&artist=&album=&track=
	 * @param {Response<JSON>} res 
	 */
	play: function (req, res) {
		return new Promise((resolve, reject) => {
			getSpotifyApi(res.locals.username).then(function (api) {
				let type = req.query.type;
				let artist = req.query.artist;
				let album = req.query.album;
				let track = req.query.track;

				if (type == 'track') {

					self.getSearchResult(api, 'track', artist, null, track).then(function(track) {
						api.play({ context_uri: track.album.uri, offset: {position: track.track_number-1} }).then(function(data) {
							resolve();
						}).catch(function(ex) {
							reject(ex);
						})
					}).catch(function(ex) {
						reject(ex);
					});

				} else if (type == 'album') {

					self.getSearchResult(api, 'album', artist, album).then(function (album) {
						api.play({ context_uri: album.uri }).then(function () {
							resolve();
						}).catch(function (ex) {
							reject('Error playing album: ' + ex);
						})
					}).catch(function (ex) {
						reject('Error getting search results: ' + ex);
					});

				} else if (type == 'artist') {

					self.getSearchResult(api, 'artist', artist).then(function (artist) {
						api.play({ context_uri: artist.uri }).then(function () {
							resolve();
						}).catch(function (ex) {
							reject('Error playing album: ' + ex);
						})
					}).catch(function (ex) {
						reject('Error getting search results: ' + ex);
					});

				}
			}).catch(function (ex) {
				logger.log(logger.ERROR, `Error getting spotify API`, ex);
			});
		});
	},

}
