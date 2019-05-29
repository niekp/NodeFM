const config = require('config');
const sqlite3 = require('sqlite3');
const fs = require('fs')

var database = (function () {

	let database_folder = './';

	if (config.has('database_folder')) {
		database_folder = config.get('database_folder');
		if (database_folder.substr(0, database_folder -1) !== '/') {
			database_folder += '/';
		}

	}
	
	let database = [];

	this.getDatabasePath = function(username) {
		return database_folder + username + '.db';
	}

	/**
	 * Check if the DB of this user is connected
     * @param {string} username
	 * @returns {bool}
	 */
	this.isConnected = function(username) {
		if (!database[username] || !database[username].open) {
			return false;
		}

		return true;
	}

	/**
	 * Connect to the DB of a user
     * @param {string} username 
	 * @returns {Promise} - resolve on connect, rectect on error
	 */
	this.connect = function(username, mode = sqlite3.OPEN_READONLY) {
		return new Promise((resolve, reject) => {
			if (this.isConnected(username)) {
				resolve(true);
			} else {
				let database_path = this.getDatabasePath(username);

				try {
					if (fs.existsSync(database_path)) {
						database[username] = new sqlite3.Database(database_path, mode, (error) => {
							if (error) {
								reject("Error connecting to the database", error);
							}

							resolve(true);
						});
					} else {
						reject("Database not found", error);
					}
				} catch(error) {
					reject("Error connecting to the database", error);
				}
			}
		});
	}
	
	/**
	 * Execute a query on the DB of a user and return all the results
     * @param {string} query 
     * @param {string} username
	 * @returns {Promise} - and in the resolve {Array} result
	 */
	this.executeQuery = function(query, username, params = []) {
		return new Promise((resolve, reject) => {
			if (this.isConnected(username)) {
				// Execute the query
				database[username].serialize(() => {
					database[username].all(query, params, (error, result) => {
						if (error) {
							reject(error);
						}
	
						resolve(result);
					});
				});

			} else { // Try to reconnect and execute the query
				if (database[username] && database[username].open === false) {
					this.connect(username, database[username].mode).then(function (success) {
						if (success) {
							database[username].serialize(() => {
								database[username].all(query, params, (error, result) => {
									if (error) {
										reject('Error reopening DB: ' + error);
									}
				
									// Execute the query
									database[username].serialize(() => {
										database[username].all(query, (error, result) => {
											if (error) {
												reject(error);
											}
						
											resolve(result);
										});
									});

								});
							});
						} else {
							reject('Database closed. Reopening failed');
						}
					})
				} else {
					reject('Database closed.');
				}
			}
		});
	}
  
	return this;
  
})();

module.exports = database;
