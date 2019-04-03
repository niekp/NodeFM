var config = require('config');
var sqlite3 = require('sqlite3');

var database = (function () {

    let database_path = config.get('sqlite');
	let database = new sqlite3.Database(database_path, (err) => {
		if (err) {
			console.error(err.message);
		}
    });

    this.executeQuery = function(query) {
        return new Promise((resolve, reject) => {
            database.serialize(() => {
                database.all(query, (err, result) => {
                    if (err) {
                        reject(err);
                    }

                    resolve(result);
                });
            });
        });
    }
  
    return this;
  
})();

module.exports = database;
