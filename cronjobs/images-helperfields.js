var database = require('../db.js')
const sqlite3 = require('sqlite3');
const config = require('config');
var fs = require('graceful-fs')

let database_folder = config.get('database_folder');

if (database_folder.substr(0, database_folder - 1) !== '/') {
	database_folder += '/';
}

// Running status per user
let running = [];

module.exports = {
	run: function () {
		// Loop through all users
		fs.readdir(database_folder, function (error, files) {
			if (error) {
				return console.error('Unable to scan users: ' + error);
			}

			files.forEach(function (user_file) {
				let username = '';
				if (user_file.indexOf('.db') > 0) {
					username = user_file.replace('.db', '');
				}

				if (username) {
					database.connect(username, sqlite3.OPEN_READWRITE).then(function () {
						
						database.executeQuery(`
UPDATE Album SET 
    image = (
        SELECT url FROM Images AS I WHERE I.link_id = Album.id AND type = 'album'
            AND (
                (source = 'lastfm' AND key = 'extralarge')
                or (source = 'spotify' AND key = '300x300')
            )
            AND url != ''
    ),
    image_small = (
        SELECT url FROM Images AS I WHERE I.link_id = Album.id AND type = 'album'
            AND (
                (source = 'lastfm' AND key = 'medium')
                or (source = 'spotify' AND key = '64x64')
            )
            AND url != ''
    ),
    image_big = (
        SELECT url FROM Images AS I WHERE I.link_id = Album.id AND type = 'album'
            AND (
                (source = 'lastfm' AND key = 'extralarge')
                or (source = 'spotify' AND key = '640x640')
            )
            AND url != ''
    )
    WHERE (image IS NULL or image_small IS NULL OR image_big IS NULL
            OR image = '' or image_small = '' OR image_big = '') AND id IN (
        SELECT link_id FROM Images where type = 'album'
    );
						`, username).catch(function(ex) {
							console.error(ex);
						});
					}).catch(function(ex) {
						console.error(ex)
					});
				}
			});
		});
	},
}
