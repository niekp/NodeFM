const config = require('config');
const sqlite3 = require('sqlite3');
const fs = require('fs')

var database = (function () {

	let database_folder = config.get('database_folder');
	if (database_folder.substr(0, database_folder -1) !== '/') {
		database_folder += '/';
	}

	let database = [];

	this.isConnected = function(username) {
		if (!database[username] || !database[username].open) {
			return false;
		}

		return true;
	}

	this.connect = function(username) {
		return new Promise((resolve, reject) => {
			let database_path = database_folder + username + '.db';

			try {
				if (fs.existsSync(database_path)) {
					database[username] = new sqlite3.Database(database_path, sqlite3.OPEN_READONLY, (error) => {
						if (error) {
							reject("Error connecting to the database", error);
						}

						resolve(true);
					});
				}
			} catch(error) {
				reject("Error connecting to the database", error);
			}
		});
	}
	
	this.executeQuery = function(query, username) {
		return new Promise((resolve, reject) => {
			if (!this.isConnected(username)) {
				reject('Database closed or not found');
			}
			
			database[username].serialize(() => {
				database[username].all(query, (error, result) => {
					if (error) {
						reject(error);
					}

					resolve(result);
				});
			});
		});
	}
  
	return this;
  
})();

module.exports = database;
