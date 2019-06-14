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
    this.addTable = async function(table, query) {
        if (!await tableExists(table)) {
            await executeQuery(query);
        }
    }

     /**
     * Check if the table exists. If not execute the query (the create table)
     * @param {string} table
     * @param {string} column
     * @param {string} type
     * @return {Promise} resolve when complete
     */
    this.addColumn = async function(table, column, type) {
        let table_exists = await tableExists(table);
        if (table_exists) {
            // Check if the column exists
            let column_exists = await columnExists(table, column);
            if (!column_exists) {
                await executeQuery(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
            }
        } else {
            throw 'Table doesn\'t exist';
        }
    }

    /**
     * Public function to execute a query. This doesn't require a username parameter like the database.executeQuery does.
     * @param {string} table 
     * @returns {Promise} resolve with the query result.
     */
    this.executeQuery = async function(query) {
        return await executeQuery(query);
    }

    /**
     * Internal function to check if a table exists
     * @param {string} table 
     * @returns {Promise} resolve true if exists.
     */
    var tableExists = async function(table) {
        var data = await executeQuery(`SELECT name FROM sqlite_master WHERE type = 'table' AND name='${table}'`);
        return data.length > 0;
    }

    /**
     * Internal function to check if a column exists
     * @param {string} table 
     * @param {string} column 
     * @returns {Promise} resolve true if exists.
     */
    var columnExists = async function(table, column) {
        let data = await executeQuery(`PRAGMA table_info('${table}')`);
        let exists = false;
        data.forEach(function(row) {
            if (row.name === column) {
                exists = true;
            }
        });

        return exists;
    }

    /**
     * Internal function to execute a query. This doesn't require a username parameter like the database.executeQuery does.
     * @param {string} table 
     * @returns {Promise} resolve with the query result.
     */
    var executeQuery = async function(query) {
        await database.connect(user, sqlite3.OPEN_READWRITE);
        let data = await database.executeQuery(query, user);
        return data;
    }

}

module.exports = MigrationHelper;
