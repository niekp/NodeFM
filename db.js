const config = require('config');
const sqlite3 = require('sqlite3');
const fs = require('fs')

var database = (function () {

	let database_path = config.get('sqlite');
	let database;

	try {
		if (fs.existsSync(database_path)) {
			database = new sqlite3.Database(database_path, (error) => {
				if (error) {
					throw error;
				}
			});
		}
	} catch(error) {
		console.error(error);
	}

	this.executeQuery = function(query) {
		return new Promise((resolve, reject) => {
			
			if (!database || !database.open) {
				reject('Database closed or not found');
			}

			database.serialize(() => {
				database.all(query, (error, result) => {
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
