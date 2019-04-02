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
app.use(express.static('public'));

// Start the import script to get the most recent data. async because we don't know how long it takes.
//var script = shell.exec(config.get('import_script'), { async: true, silent: true }, function() {	
///});

// Endpoints
app.get('/', function (req, res) {
	getRecentTracks().then(function (tracks) {
		res.render('index', { title: 'Recent tracks', tracks: tracks })
	});
});

app.get('/artists', function (req, res) {
	getTopArtists().then(function (tracks) {
		res.render('top-artists', { title: 'Top 10 artists', tracks: tracks })
	});
});

app.get('/albums', function (req, res) {
	getTopAlbums().then(function (tracks) {
		res.render('top-albums', { title: 'Top 10 albums', tracks: tracks })
	});
});


// Start server
app.listen(port, () => console.log(`Server started on port ${port}`))

/***************************************************************************** */
/***************************************************************************** */

function getRecentTracks(limit = 10, offset = 0) {
	return executeQuery(`SELECT artist, track FROM Scrobble ORDER BY UTS DESC LIMIT ${offset},${limit}`);
}


function getTopArtists(limit = 10, offset = 0) {
	return executeQuery(`
	select artist, count(*) as scrobbles
	from Scrobble
	group by Artist
	order by Scrobbles desc
	limit ${offset},${limit}`);
}

function getTopAlbums(limit = 10, offset = 0) {
	return executeQuery(`
	select artist, album, count(*) as scrobbles
	from Scrobble
	group by Artist, Album
	order by Scrobbles desc
	limit ${offset},${limit}`);
}

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
function executeQuery(query) {
	var db = getDatabase();

	return new Promise((resolve, reject) => {
		db.serialize(() => {
			db.all(query, (err, result) => {
				if (err) {
					reject(err);
				}

				resolve(result);
			});
		});
	});
}
