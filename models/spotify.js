var SpotifyWebApi = require('spotify-web-api-node');
var spotify_helper = require('./spotify_helper.js')
var cache_helper = require('./cache_helper.js');

/**
 * Get the spotify API with token
 * @param {Request} req 
 * @param {Response} res 
 * @returns {Promise<SpotifyWebApi>}
 */
function getSpotifyApi(req, res) {
    return new Promise((resolve, reject) => {
        var spotifyApi = new SpotifyWebApi();
        spotify_helper.getToken(req, res).then(function (token) {
            spotifyApi.setAccessToken(token);
            resolve(spotifyApi);
        }).catch(function(ex) {
            reject(ex);
        });
    });
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
        query += 'artist:' + artist + ' ';
    if (album)
        query += 'album:' + album + ' ';
    if (track)
        query += 'track:' + track + ' ';

    return query.trim();
}

/**
 * Get the first search result
 * @param {SpotifyWebApi} api 
 * @param {string} type - track, album, artist
 * @param {string} artist 
 * @param {string} album 
 * @param {string} track 
 * @returns {Promise<Object>} Return the web response
 */
function getSearchResult(api, type, artist, album, track) {
    return new Promise((resolve, reject) => {

        let cache_key = type + '_' + getSearchQuery(artist, album, track);
        let cache_expire = cache_helper.getExpiresSeconds('month');

        cache_helper.get(cache_key).then(function(result) {
            resolve(result);
        }).catch(function() {
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
                })
            } else if (type == 'artist') {
                api.searchArtists(getSearchQuery(artist), { limit: 1 }).then(function (results) {
                    if ((artist = results.body.artists.items) && artist.length > 0) {
                        cache_helper.save(cache_key, artist[0], cache_expire, 'json');
                        resolve(artist[0]);
                    } else {
                        reject('No results');
                    }
                })
            }
        });
    });
}

module.exports = {
    /**
     * Skip the current song
     * @param {Request} req 
     * @param {Response} res 
     */
    next: function (req, res) {
        getSpotifyApi(req, res).then(function(api) {
            api.skipToNext().then(function () {
                resolve();
            }).catch(function(ex) {
                reject(ex);
            })
        }).catch(function (ex) {
            reject(ex);
        });
    },

    /**
     * Play a track, album or artist
     * @param {Request} req - search with ?type=&artist=&album=&track=
     * @param {Response<JSON>} res 
     */
    play: function (req, res) {
        return new Promise((resolve, reject) => {
            getSpotifyApi(req, res).then(function (api) {
                let type = req.query.type;
                let artist = req.query.artist;
                let album = req.query.album;
                let track = req.query.track;

                if (type == 'track') {

                    getSearchResult(api, 'track', artist, null, track).then(function(track) {
                        api.play({ context_uri: track.album.uri, offset: {position: track.track_number-1} }).then(function(data) {
                            resolve();
                        }).catch(function(ex) {
                            reject(ex);
                        })
                    }).catch(function(ex) {
                        reject(ex);
                    });

                } else if (type == 'album') {

                    getSearchResult(api, 'album', artist, album).then(function (album) {
                        api.play({ context_uri: album.uri }).then(function () {
                            resolve();
                        }).catch(function (ex) {
                            reject('Error playing album: ' + ex);
                        })
                    }).catch(function (ex) {
                        reject('Error getting search results: ' + ex);
                    });

                } else if (type == 'artist') {

                    getSearchResult(api, 'artist', artist).then(function (artist) {
                        api.play({ context_uri: artist.uri }).then(function () {
                            resolve();
                        }).catch(function (ex) {
                            reject('Error playing album: ' + ex);
                        })
                    }).catch(function (ex) {
                        reject('Error getting search results: ' + ex);
                    });

                }
            });
        });
    }
}
