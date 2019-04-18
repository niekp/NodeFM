var database = require('../db.js')
const sqlite3 = require('sqlite3');
const config = require('config');
const fs = require('fs');

var NB = require('../custom_modules/nodebrainz');
var moment = require('moment');

let database_folder = config.get('database_folder');

if (database_folder.substr(0, database_folder -1) !== '/') {
    database_folder += '/';
}

// Setup musicbrainz
var nb = new NB({userAgent:'nodefm/1.0.0 (nodefm@niekvantoepassing.nl)', retryOn: true });

var getMbIdFromId = function(id) {
    if (id.substr(0, 5) === 'mbid:')
        return id.replace('mbid:', '');
    return null;
}

module.exports = {
    run: function() {
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
                        
                        database.executeQuery("SELECT * FROM Album WHERE id LIKE 'mbid:%' AND mbid IS NULL", username).then(function(albums) {

                            var timer = 0;
                            albums.forEach(function(album) {
                                setTimeout(function () {
                                    var mbid = getMbIdFromId(album.id);

                                    if (!mbid) {
                                        return;
                                    }

                                    console.log('doe verzoek' + mbid);
                                    nb.release(mbid, { inc: 'artists+recordings' }, function(err, response) {
                                        if (err) {
                                            console.error(err);
                                            return;
                                        }

                                        if (!response) {
                                            return;
                                        }

                                        console.log(album.name);

                                        var release_date = moment(response.date, "YYYY-MM-DD").format("X");

                                        // Update album info
                                        database.executeQuery(`UPDATE Album SET musicbrainz_last_search = CURRENT_TIMESTAMP, mbid = ?, release_date = ? WHERE id = ?`, username, [
                                            mbid, release_date, album.id
                                        ]).catch(function(error) {
                                            console.error(error);
                                        });

                                        // Update artist info
                                        database.executeQuery(`UPDATE Artist SET musicbrainz_last_search = CURRENT_TIMESTAMP, mbid = ? WHERE id = ? AND name = ?`, username, [
                                            response['artist-credit'][0].artist.id, album.artist_id, response['artist-credit'][0].artist.name
                                        ]).catch(function(error) {
                                            console.error(error);
                                        });

                                        // Search for tracks and update them
                                        response.media.forEach(function(media) {
                                            media.tracks.forEach(function(track_mb) {
                                                console.log(mbid, track_mb.title)
                                                database.executeQuery(`SELECT * FROM Track WHERE album_id = ? AND name = ?`, username, [
                                                    album.id, track_mb.title
                                                ]).then(function (result) {
                                                    if (result.length) {
                                                        track_result = result[0];

                                                        database.executeQuery(`UPDATE Track SET 
                                                            musicbrainz_last_search = CURRENT_TIMESTAMP,
                                                            mbid = ?,
                                                            milliseconds = ?,
                                                            track_number = ?
                                                            WHERE id = ?`, username,
                                                            [
                                                                track_mb.id,
                                                                track_mb.length,
                                                                track_mb.position,
                                                                track_result.id
                                                            ]).catch(function(error) {
                                                                console.error(error);
                                                            });
                                                    }
                                                    

                                                }).catch(function(error) {
                                                    console.error(error);
                                                });
                                            })
                                        });
                                    });
                                }, timer);

                                timer += 1000;
                            });

                        }).catch(function(error) {
                            console.error(error);
                        });

                    }).catch(function(error) {
                        console.error(error);
                    });

                }
            });
        });
    }
}
