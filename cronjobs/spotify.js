var database = require('../db.js')
const sqlite3 = require('sqlite3');
const config = require('config');
const fs = require('fs');
const spotify = require('../models/spotify.js');
const spotify_helper = require('../models/spotify_helper.js');

let database_folder = config.get('database_folder');

if (database_folder.substr(0, database_folder -1) !== '/') {
    database_folder += '/';
}

var running = false;

function updateNowPlaying(username) {
    spotify.nowplaying(username).then(function(now_playing) {
        
        console.log(now_playing)
    }).catch(function(ex) {
        console.error(ex);
    })
}

module.exports = {
    
    isRunning: function() {
        return running;
    },

    run: function() {
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
                if (username) {
                    console.log('connect', username)
                                        
                    database.connect(username, sqlite3.OPEN_READWRITE).then(function () {
                        spotify_helper.getValue('username', username).then(function(spotify_username) {
                            if (spotify_username.length) {
                                updateNowPlaying(username);
                            }
                        })

                    }).catch(function(error) {
                        console.error(error);
                    });

                }
            });
        });
    },

}


module.exports.run();