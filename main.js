var config = require('config');
var sqlite3 = require('sqlite3');
const shell = require('shelljs');
const express = require('express')

// Singleton keys and object
const DB_KEY = 'database';
var global = [];

// Webserver settings
const app = express()
const port = 3000
app.set('view engine', 'pug')

// Start the import script to get the most recent data. async because we don't know how long it takes.
//var script = shell.exec(config.get('import_script'), { async: true, silent: true }, function() {	
///});

// Endpoints
app.get('/', function (req, res) {
	getTracks().then(function (tracks) {
		res.render('index', { tracks: tracks })
	});
});

// Start server
app.listen(port, () => console.log(`Server started on port ${port}`))

/***************************************************************************** */
/***************************************************************************** */

// Get the DB
function getDatabase() {
	if (global[DB_KEY]) {
		return global[DB_KEY];
	}

	var database_path = config.get('sqlite');
	global[DB_KEY] = new sqlite3.Database(database_path, (err) => {
		if (err) {
			console.error(err.message);
		}
	});

	return global[DB_KEY];
}

// Get the last 10 scrobbles
function getTracks() {
	var db = getDatabase();

	return new Promise((resolve, reject) => {
		db.serialize(() => {
			db.all("SELECT Artist, Track FROM Scrobble ORDER BY UTS DESC LIMIT 10", (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	});
}

