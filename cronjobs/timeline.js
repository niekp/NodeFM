var database = require('../db.js')
const sqlite3 = require('sqlite3');
const config = require('config');
const fs = require('fs');

let CRONJOB_KEY = 'timeline';

let database_folder = config.get('database_folder');

if (database_folder.substr(0, database_folder -1) !== '/') {
    database_folder += '/';
}


function getLastRun(username) {
    return new Promise((resolve, reject) => {
        database.executeQuery(
            `SELECT utc FROM Cronjob WHERE key = '${CRONJOB_KEY}' AND status = 'SUCCESS' ORDER BY utc DESC LIMIT 0, 1`,
            username
        ).then(function(data) {
            if (!data.length) {
                resolve(157770000); // The minimum. The api is a bit buggy so it contains some 1970 timestamps.
            } else {
                resolve(data[0].utc);
            }

        }).catch(function (error) {
            reject(error);
        });
    });
    
    
}

function getMonthTotalFromPeriod(period) {
	let year = parseInt(period.split('-')[0]);
	let month = parseInt(period.split('-')[1]);

	return (year * 12) + month
}

function getPeriod(username) {
    return new Promise((resolve, reject) => {
        getLastRun(username).then(function (last_run) {
            database.executeQuery(`
            SELECT MIN(STRFTIME('%Y-%m', DATETIME(utc, 'unixepoch'))) AS start, 
            MAX(STRFTIME('%Y-%m', DATETIME(utc, 'unixepoch'))) as end 
            FROM Scrobble
            WHERE utc > '${last_run}'`,
            username).then(function (data) {
                resolve(data);
            }).catch(function (error) {
                reject(error);
            });
        }).catch(function (error) {
            reject(error);
        });
    });
    
    
}

function getTopArtist(period, username) {
    return new Promise((resolve, reject) => {

        return database.executeQuery(
            `SELECT A.name, COUNT(*) AS count FROM Scrobble as S
            INNER JOIN Artist as A
            ON A.id = S.artist_id
            WHERE STRFTIME('%Y-%m', DATETIME(S.utc, 'unixepoch')) = '${period}'
            GROUP BY A.name
            ORDER BY count DESC
            LIMIT 0, 1`,
            username
        ).then(function(data) {
            if (data.length) {
                resolve(data[0]);
            } else {
                resolve(null);
            }
        }).catch(function(error) {
            reject(error);
        })
    });
}

function saveTopArtist(topArtistPromise, period, username) {
    return new Promise((resolve, reject) => {

        topArtistPromise.then(function (artist) {
            if (artist) {
                database.executeQuery(`DELETE FROM ArtistTimeline WHERE period = '${period}'`, username).then(function () {
                    database.executeQuery(`INSERT INTO ArtistTimeline (artist, period, scrobbles) VALUES ('${artist.name}', '${period}', ${artist.count})`, username).then(function() {
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });

                }).catch(function (error) {
                    reject(error);
                });
            }
        }).catch(function (error) {
            reject(error);
        });
        
    });
}


// Loop through all users
fs.readdir(database_folder, function (error, files) {
    if (error) {
        return console.error('Unable to scan users: ' + error);
    }

    let promises = [];

    files.forEach(function (user_file) {
        let username = '';
        if (user_file.indexOf('.db') > 0) {
            username = user_file.replace('.db', '');
        }
        if (username) {
            database.connect(username, sqlite3.OPEN_READWRITE).then(function () {
                promises[username] = [];

                getPeriod(username).then(function (period) {
                    let done = false;
                    let start, end, current;

                    if (!period[0]['start'] || !period[0]['end']) {
                        done = true;
                    } else {
                        start = period[0]['start'];
                        end = period[0]['end'];    
                        current = start;
                    }

                    while (!done) {
                        // Setup this period
                        let year = current.split('-')[0];
                        let month = current.split('-')[1];

                        promises[username].push(saveTopArtist(getTopArtist(current, username), current, username));

                        // Check if done
                        if (getMonthTotalFromPeriod(current) >= getMonthTotalFromPeriod(end)) {
                            done = true;
                        }


                        // Setup next period
                        month++;
                        if (month > 12) {
                            month = 1;
                            year++;
                        }

                        current = year + '-' + month.toString().padStart(2, '0');
                    }

                    Promise.all(promises[username]).then(function () {
                        database.executeQuery(
                            `INSERT INTO Cronjob (key, status) VALUES ('${CRONJOB_KEY}', 'SUCCESS')`,
                            username
                        );
                    }).catch(function(error) {
                        database.executeQuery(
                            `INSERT INTO Cronjob (key, status, info) VALUES ('${CRONJOB_KEY}', 'FAIL', '${error}')`,
                            username
                        )
                    })
                    
                }).catch(function (error) {
                    console.error(error)
                })
            });

        }
    });
});
