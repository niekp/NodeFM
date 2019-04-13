var database = require('../db.js');
const sqlite3 = require('sqlite3');

function MigrationHelper(user) {

    this.addTable = function(table, query) {
        return new Promise((resolve, reject) => {
            tableExists(table).then(function (exists) {
                if (!exists) {
                    executeQuery(query).then(function () {
                        resolve();
                    }).catch(function (error) {
                        reject(error);
                    });
                } else {
                    resolve();
                }
            }).catch(function (error) {
                reject(error);
            });
        });
    }

    var tableExists = function(table) {
        return new Promise((resolve, reject) => {
            var query = executeQuery(`SELECT name FROM sqlite_master WHERE type = 'table' AND name='${table}'`);
    
            query.then(function(data) {
                resolve(data.length > 0);
            }).catch(function(error) {
                reject(error);
            })

        });
    }

    var executeQuery = function(query) {
        return new Promise((resolve, reject) => {
            database.connect(user, sqlite3.OPEN_READWRITE).then(function () {
                database.executeQuery(query, user).then(function (data) {
                    resolve(data);
                }).catch(function (error) {
                    reject(error);
                });
            }).catch(function (error) {
                reject(error);
            });
        });
    }

}

module.exports = MigrationHelper;
