var database = require('../db.js')
const sqlite3 = require('sqlite3');
const config = require('config');
const fs = require('fs');
const lastfm_helper = require('../models/lastfm_helper');

let database_folder = config.get('database_folder');

if (database_folder.substr(0, database_folder - 1) !== '/') {
	database_folder += '/';
}

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
					lastfm_helper.syncLastFm(username);
				}
			});
		});
	},
}

module.exports.run();