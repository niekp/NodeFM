var fs = require('graceful-fs')
const path = require('path');
const config = require('config');
var database = require('../db.js');
const sqlite3 = require('sqlite3');

let database_folder = config.get('database_folder');

if (database_folder.substr(0, database_folder -1) !== '/') {
    database_folder += '/';
}

const migrationsFolder = path.join(__dirname, '../migrations');

// Don't run these files as migration
const blacklist = ['helper.js'];

/**
 * Set the success status of a migration.
 * @param {string} user 
 * @param {string} migration_file 
 * @param {string} status 
 */
function setStatus(user, migration_file, status) {
    database.executeQuery(`INSERT INTO Migration (name, status, utc) VALUES('${migration_file}', '${status}', CURRENT_TIMESTAMP)`, user).catch(function(error) {
        console.error('set status', user, error);
    });
}

/**
 * Check if a specific migration already has been run for a user.
 * @param {string} user 
 * @param {string} migration_file 
 * @return {Promise} boolean
 */
async function hasMigrationRun(user, migration_file) {
	try {
		let data = await database.executeQuery(`SELECT name FROM Migration WHERE name = '${migration_file}' AND status = 'SUCCESS'`, user);
		return data.length > 0;
	} catch (error) {
		if (error.toString().indexOf('no such table: Migration') >= 0) {
			return false;
		} else {
			throw error;
		}
	}
}

// Loop through all users
fs.readdir(database_folder, function (error, files) {
	if (error) {
		return console.error('Unable to scan users: ' + error);
	}

	let migrations = [];

	files.forEach(function (user_file) {

		let user = '';
		if (user_file.indexOf('.db') > 0) {
			user = user_file.replace('.db', '');
		}
		if (user) {
			migrations.push(user);
			migrations[user] = [];

			database.connect(user, sqlite3.OPEN_READWRITE).then(function () {
				fs.readdir(migrationsFolder, async function (err, files) {
					// Build file list
					files.sort(function (a, b) {
						return a < b ? -1 : 1;
					}).forEach(function (migration_file, key) {
						if (blacklist.indexOf(migration_file) >= 0) {
							return;
						}
						migrations[user].push(migration_file);
					});

					// Execute migrations
					for (migration_file of migrations[user]) {

						try {
							var has_run = await hasMigrationRun(user, migration_file);
							if (!has_run) {
								let migration = require(path.join(__dirname, '../migrations/', migration_file));
								let runner = new migration(user);

								try {
									console.log('Run migration', user, migration_file)
									await runner.run();
									setStatus(user, migration_file, 'SUCCESS');
								} catch (error) {
									console.error(error);
									setStatus(user, migration_file, 'FAIL');
								}
							}
						} catch (ex) {
							console.error(ex);
						}

					}
				});
			}).catch(function (error) {
				console.error(error);
			});
		}
        
    });
});
