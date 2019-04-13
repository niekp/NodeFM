const fs = require('fs');
const path = require('path');
const config = require('config');
var database = require('../db.js');
const sqlite3 = require('sqlite3');

let database_folder = config.get('database_folder');

if (database_folder.substr(0, database_folder -1) !== '/') {
    database_folder += '/';
}

const migrationsFolder = path.join(__dirname, '../migrations');

// Don't run these files as migration
const blacklist = ['helper.js'];

/**
 * Set the success status of a migration.
 * @param {string} user 
 * @param {string} migration_file 
 * @param {string} status 
 */
function setStatus(user, migration_file, status) {
    database.executeQuery(`INSERT INTO Migration (name, status, utc) VALUES('${migration_file}', '${status}', CURRENT_TIMESTAMP)`, user).catch(function(error) {
        console.error('set status', user, error);
    });
}

/**
 * Check if a specific migration already has been run for a user.
 * @param {string} user 
 * @param {string} migration_file 
 * @return {Promise} boolean
 */
function hasMigrationRun(user, migration_file) {
    return new Promise((resolve, reject) => {
        database.executeQuery(`SELECT name FROM Migration WHERE name = '${migration_file}' AND status = 'SUCCESS'`, user).then(function (data) {
            resolve(data.length > 0)
        }).catch(function(error) {
            if (error.toString().indexOf('no such table: Migration') >= 0) {
                resolve(false);
            } else {
                reject(error);
            }
        });
    });
}

fs.readdir(migrationsFolder, function (error, files) {
    if (error) {
        return console.error('Unable to scan migrations: ' + error);
    }

    // Loop through all migrations
    files.forEach(function (migration_file) {
        if (blacklist.indexOf(migration_file) >= 0) {
            return;
        }

        let migration = require(path.join(__dirname, '../migrations/', migration_file));

        // Loop through all users
        fs.readdir(database_folder, function (error, files) {
            if (error) {
                return console.error('Unable to scan users: ' + error);
            }

            files.forEach(function (user_file) {
                let user = '';
                if (user_file.indexOf('.db') > 0) {
                    user = user_file.replace('.db', '');
                }
                if (user) {
                    database.connect(user, sqlite3.OPEN_READWRITE).then(function () {
                        hasMigrationRun(user, migration_file).then(function (has_run) {
                            if (!has_run) {
                                console.log('Run', migration_file, user);
                                let runner = new migration(user);
            
                                runner.run().then(function () {
                                    setStatus(user, migration_file, 'SUCCESS');
                                }).catch(function (error) {
                                    console.error(error);
                                    setStatus(user, migration_file, 'FAIL');
                                });  
                            }
                        }).catch(function(error) {
                            console.error(error);
                        });
                    }).catch(function(error) {
                        console.error(error);
                    });
                }

            });

        });

        
    });
});
