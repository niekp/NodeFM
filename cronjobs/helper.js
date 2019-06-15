const fs = require('graceful-fs');
const config = require('config');
const database = require('../db');
const sqlite3 = require('sqlite3');

let database_folder = config.get('database_folder');

if (database_folder.substr(0, database_folder - 1) !== '/') {
    database_folder += '/';
}

/**
 * Add some helper functions to make writing cronjobs easier.
 */
let connections = [];

module.exports = {

    getUsers: function () {
        return new Promise((resolve, reject) => {
            let users = [];

            fs.readdir(database_folder, function (error, files) {
                if (error) {
                    reject('Unable to scan users: ' + error)
                }

                files.forEach(function (user_file) {
                    if (user_file.indexOf('.db') > 0 && user_file.indexOf('db-journal') < 0) {
                        username = user_file.replace('.db', '');
                        users.push(username);
                    }
                });
                
                resolve(users);
            });
        });
    },

    connect: function (username) {
        return database.connect(username, sqlite3.OPEN_READWRITE);
    }

};
