var database = require('../db.js')
var SpotifyWebApi = require('spotify-web-api-node');
var config = require('config');
var cache_helper = require('./cache_helper.js');
var security = require('./security.js')
var cache = require('express-redis-cache')({ prefix: cache_helper.getPrefix() });
var uuid = require("uuid");

/**
 * Set a value to the spotify settings table
 * @param {string} key 
 * @param {string} value 
 * @param {Response} res 
 * @see getValue
 */
function setValue(key, value, res) {
    database.executeQuery(`UPDATE Spotify SET ${key} = ?`, res.locals.username, [
        value
    ]).catch(function (error) {
        console.error(error);
    });
}

/**
 * Get a value from the spotify settings table
 * @param {string} key 
 * @param {Response} res 
 * @see setValue
 */
function getValue(key, res) {
    return new Promise((resolve, reject) => {
        database.executeQuery(`SELECT ${key} FROM Spotify`, res.locals.username).then(function (result) {
                // Something is wrong with the DB record. Reset it.
                if (result.length == 0) {
                    database.executeQuery("DELETE FROM Spotify", res.locals.username).then(function () {
                        database.executeQuery("INSERT INTO Spotify (code) values ('')", res.locals.username).then(function () {
                            resolve('');
                        }).catch(function (error) {
                            reject(error);
                        });
                    }).catch(function (error) {
                        reject(error);
                    });
                } else {
                    resolve(result ? eval('result[0].' + key) : '');                    
                }
            })
            .catch(function (error) {
                reject(error);
            });
    });
}

/**
 * Save the username of the current user
 * @param {Request} req 
 * @param {Response} res 
 */
function setMe(req, res) {
    return new Promise((resolve, reject) => {
        var spotifyApi = new SpotifyWebApi();
        module.exports.getToken(req, res).then(function (token) {
            spotifyApi.setAccessToken(token);

            spotifyApi.getMe().then(function (data) {
                setValue('username', data.body['display_name'], res);
                resolve(data.body['display_name']);
            });
        }).catch(function (ex) {
            reject(ex);
        });
    });
}

module.exports = {

    /**
    * Set a value to the spotify settings table
    * @param {string} key
    * @param {string} value
    * @param {Response} res
    * @see getValue
    */
    setValue: function(key, value, res) {
        setValue(key, value, res);
    },
    
    /**
    * Get a value from the spotify settings table
    * @param {string} key
    * @param {Response} res
    * @see setValue
    */
    getValue: function(key, res) {
        return getValue(key, res);
    },

    /**
     * Get the spotify authorize URL to redirect to
     * @param {Request} req 
     * @param {Response} res 
     * @see handleCallback - this is the function called after authenticating
     */
    getAuthorizeUrl: function (req, res) {
        var scopes = ['user-read-recently-played', 'user-read-playback-state', 'user-read-currently-playing', 'user-modify-playback-state', 'playlist-modify-public', 'playlist-modify-private', 'playlist-read-collaborative'];

        // Generate a state and save it in the cache. This is used to check the callback against.
        let state = uuid.v4();
        cache_helper.save((res.locals.username + ':spotify_state'), state, 60 * 60);

        var spotifyApi = new SpotifyWebApi({
            redirectUri: config.get('spotify_redirect_uri'),
            clientId: config.get('spotify_client')
        });

        var authorizeURL = spotifyApi.createAuthorizeURL(scopes, state);

        return authorizeURL;
    },

    /**
     * Handle the callback after authenticating with spotify. 
     * Get a token and stuff
     * @param {Request} req 
     * @param {Response} res 
     * @see getAuthorizeUrl
     */
    handleCallback: function(req, res) {
        return new Promise((resolve, reject) => {
            let wait_for = [];

            wait_for.push(cache_helper.get(res.locals.username + ':spotify_state').then(function(state) {
                console.log('State uit cache is: ', state);
                if (state !== req.query.state) {
                    console.log('Invalid state :(')
                    reject('Invalid state');
                    return;
                }
            }).catch(err => reject('Invalid state')));

            Promise.all(wait_for).then(function () {
                let code = req.query.code;
                setValue('code', code, res);

                var spotifyApi = new SpotifyWebApi({
                    redirectUri: config.get('spotify_redirect_uri'),
                    clientId: config.get('spotify_client'),
                    clientSecret: config.get('spotify_secret')
                });

                // Retrieve an access token and a refresh token
                spotifyApi.authorizationCodeGrant(code).then(function (data) {
                    setValue('refresh_token', data.body['refresh_token'], res)
                    setValue('token', data.body['access_token'], res)

                    let expires = (new Date()).getTime() + (data.body['expires_in'] * 1000)
                    setValue('token_expires', expires, res)

                    // Set the access token on the API object to use it in later calls
                    spotifyApi.setAccessToken(data.body['access_token']);
                    spotifyApi.setRefreshToken(data.body['refresh_token']);

                    cache.del('*' + res.locals.username + '*', function (error, added) { });

                    setMe(req, res).then(function() {
                        resolve();
                    })
                }, function (err) {
                    reject(err);
                }).catch(function(err) {
                    reject(err);
                });
            }).catch(function(err) {
                reject(err);
            });
        });
    },

    /**
     * Unlink the spotify account
     * @param {Request} req 
     * @param {Response} res 
     */
    unlink: function(req, res) {
        return new Promise((resolve, reject) => {

            promises = [];
            promises.push(setValue('refresh_token', '', res))
            promises.push(setValue('token', '', res))
            promises.push(setValue('code', '', res))
            promises.push(setValue('username', '', res))
            promises.push(setValue('token_expires', '', res))
            cache.del('*' + res.locals.username + '*', function (error, added) { });
            Promise.all(promises).then(function () {
                resolve();
            }).catch(function() {
                reject();
            });
        });
    },

    /**
     * Get a spotify token. Use the current token if its still valid.
     * @param {Request} req 
     * @param {Response} res 
     */
    getToken: function(req, res) {
        return new Promise((resolve, reject) => {
            current_token = getValue('token', res);
            current_token_expires = getValue('token_expires', res)
            current_refresh_token = getValue('refresh_token', res);

            Promise.all([current_token, current_refresh_token, current_token_expires]).then(function (values) {
                // TODO: Uitzoeken hoe ik die promisses netjes resolve zonder deze gekkigheid
                current_token = values[0];
                current_refresh_token = values[1];
                current_token_expires = values[2];

                // Is the current token still valid?
                if (parseInt(current_token_expires) < (new Date()).getTime()) {
                    resolve(current_token);
                } else {
                    var spotifyApi = new SpotifyWebApi({
                        redirectUri: config.get('spotify_redirect_uri'),
                        clientId: config.get('spotify_client'),
                        clientSecret: config.get('spotify_secret')
                    });

                    // Get a new token
                    spotifyApi.setRefreshToken(current_refresh_token);
                    spotifyApi.refreshAccessToken().then(
                        function (data) {
                            spotifyApi.setAccessToken(data.body['access_token']);

                            let expires = (new Date()).getTime() + (data.body['expires_in'] * 1000)
                            setValue('token_expires', expires, res)
                            setValue('token', data.body['access_token'], res)

                            resolve(data.body['access_token']);
                        },
                        function (err) {
                            console.error(err);
                            reject('Could not refresh access token');
                        }
                    );
                }

            }).catch(function (error) {
                reject(error);
            })
        });
    },

    /**
     * Inject local variables. Used for displaying the menu and stuff.
     * @param {Request} req 
     * @param {Response} res 
     * @returns {Promise}
     */
    injectLocalVariables: function (req, res) {
        return new Promise((resolve, reject) => {
            security.isUnlocked(req, res).then(function(unlocked) {
                if (unlocked) {
                    getValue('username', res).then(function (username) {
                        res.locals.spotify_username = username;
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    })
                } else {
                    resolve();
                }
            }).catch(function (error) {
                reject(error);
            });
        });
    },
}
