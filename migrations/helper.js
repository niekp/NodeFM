var database = require('../db.js');
const sqlite3 = require('sqlite3');

/**
 * Add some helper functions to make writing migrations easier.
 * @param {string} user 
 */
function MigrationHelper(user) {

    /**
     * Check if the table exists. If not execute the query (the create table)
     * @param {string} table
     * @param {string} query
     * @return {Promise} resolve when complete
     */
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

     /**
     * Check if the table exists. If not execute the query (the create table)
     * @param {string} table
     * @param {string} column
     * @param {string} type
     * @return {Promise} resolve when complete
     */
    this.addColumn = function(table, column, type) {
        return new Promise((resolve, reject) => {
            tableExists(table).then(function (table_exists) {
                if (table_exists) {

                    // Check if the column exists
                    columnExists(table, column).then(function(column_exist) {
                        if (!column_exist) {
                            executeQuery(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).then(function () {
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
                

                } else {
                    reject('Table doesn\'t exist');
                }
            }).catch(function (error) {
                reject(error);
            });
        });
    }

    /**
     * Public function to execute a query. This doesn't require a username parameter like the database.executeQuery does.
     * @param {string} table 
     * @returns {Promise} resolve with the query result.
     */
    this.executeQuery = function(query) {
        return executeQuery(query);
    }

    /**
     * Internal function to check if a table exists
     * @param {string} table 
     * @returns {Promise} resolve true if exists.
     */
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

    /**
     * Internal function to check if a column exists
     * @param {string} table 
     * @param {string} column 
     * @returns {Promise} resolve true if exists.
     */
    var columnExists = function(table, column) {
        return new Promise((resolve, reject) => {
            var query = executeQuery(`PRAGMA table_info('${table}')`);
    
            query.then(function(data) {
                exists = false;
                data.forEach(function(row) {
                    if (row.name === column) {
                        exists = true;
                    }
                });

                resolve(exists);
            }).catch(function(error) {
                reject(error);
            })

        });
    }

    /**
     * Internal function to execute a query. This doesn't require a username parameter like the database.executeQuery does.
     * @param {string} table 
     * @returns {Promise} resolve with the query result.
     */
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
