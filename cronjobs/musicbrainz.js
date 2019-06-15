const database = require('../db');
const sqlite3 = require('sqlite3');
const config = require('config');
const fs = require('fs');
const logger = require('../models/logger');
const NB = require('../custom_modules/nodebrainz');
const moment = require('moment');

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


nb.release('52ee3840-a4a6-4d4d-9ce3-ca82453bd1f4', { inc: 'artists+recordings' }, function(err, response) {
    response.media[0].tracks.forEach(function(track) {
        var title = track.title;
        title = title.replace(/\’/g, "'");
        title = title.replace(/\\'/g, "'");
    })
});

var running = false;

module.exports = {
    
    isRunning: function() {
        return running;
    },

    run: function() {
        running = true;
        // Loop through all users
        fs.readdir(database_folder, function (error, files) {
            if (error) {
                logger.log(logger.ERROR, `Musicbrainz: Unable to scan users`);
            }

            var timer = 0;

            var total = 0;
            var done = 0;

            files.forEach(function (user_file) {
                let username = '';
                if (user_file.indexOf('.db') > 0) {
                    username = user_file.replace('.db', '');
                }
                if (username) {
                                        
                    database.connect(username, sqlite3.OPEN_READWRITE).then(function () {
                        
                        database.executeQuery("SELECT * FROM Album WHERE (id LIKE 'mbid:%' OR mbid IS NOT NULL) AND musicbrainz_last_search IS NULL", username).then(function(albums) {

                            albums.forEach(function(album) {
                                total++;
                                setTimeout(function () {
                                    done++;

                                    // If done, set done state 2 minutes later. A bit arbitrary, but will work for now.
                                    if (done >= total) {
                                        setTimeout(function() {
                                            if (done >= total)
                                                running = false;
                                        }, 60*2*1000);
                                    }

                                    var mbid = album.mbid ? album.mbid : getMbIdFromId(album.id);

                                    if (!mbid) {
                                        return;
                                    }

                                    nb.release(mbid, { inc: 'artists+recordings' }, function(err, response) {
                                        if (err) {
                                            logger.log(logger.ERROR, `Musicbrainz: error getting release`, err);
                                            return;
                                        }

                                        if (!response) {
                                            return;
                                        }

                                        var release_date = moment(response.date, "YYYY-MM-DD").format("X");

                                        // Update album info
                                        database.executeQuery(`UPDATE Album SET musicbrainz_last_search = CURRENT_TIMESTAMP, mbid = ?, release_date = ? WHERE id = ?`, username, [
                                            mbid, release_date, album.id
                                        ]).catch(function(ex) {
                                            logger.log(logger.ERROR, `Musicbrainz: updating album`, ex);
                                        });

                                        // Update artist info
                                        database.executeQuery(`UPDATE Artist SET musicbrainz_last_search = CURRENT_TIMESTAMP, mbid = ? WHERE id = ? AND name LIKE ?`, username, [
                                            response['artist-credit'][0].artist.id, album.artist_id, response['artist-credit'][0].artist.name
                                        ]).catch(function(ex) {
                                            logger.log(logger.ERROR, `Musicbrainz: updating artist`, ex);
                                        });

                                        // Search for tracks and update them
                                        response.media.forEach(function(media) {
                                            media.tracks.forEach(function(track_mb) {

                                                // Correct the title
                                                var title = track_mb.title;
                                                title = title.replace(/\’/g, "'");
                                                title = title.replace(/\\'/g, "'");
                                                title = title.replace(/\?/g, "and");

                                                database.executeQuery(`SELECT * FROM Track WHERE album_id = ? AND (replace(name, '&', 'and') LIKE ? OR id = ?)`, username, [
                                                    album.id, title, 'mbid:' + track_mb.id
                                                ]).then(function (result) {
                                                    if (result.length) {
                                                        track_result = result[0];

                                                        database.executeQuery(`UPDATE Track SET 
                                                            musicbrainz_last_search = CURRENT_TIMESTAMP,
                                                            mbid = ?,
                                                            duration = ?,
                                                            track_number = ?
                                                            WHERE id = ?`, username,
                                                            [
                                                                track_mb.id,
                                                                Math.round(track_mb.length / 1000),
                                                                track_mb.position,
                                                                track_result.id
                                                            ]).catch(function(ex) {
                                                                logger.log(logger.ERROR, `Musicbrainz: updating track`, ex);
                                                            }
                                                        );
                                                    }
                                                    

                                                }).catch(function(ex) {
                                                    logger.log(logger.ERROR, `Musicbrainz: selecting track`, ex);
                                                });
                                            })
                                        });
                                    });
                                }, timer);

                                timer += 1000;
                            });

                        }).catch(function(ex) {
                            logger.log(logger.ERROR, `Musicbrainz: selecting album`, ex);
                        });

                    }).catch(function(ex) {
                        logger.log(logger.ERROR, `Musicbrainz: connecting db`, ex);
                    });

                }
            });
        });
    },

}
