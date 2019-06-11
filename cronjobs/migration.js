var fs = require('graceful-fs')
const path = require('path');
const config = require('config');
var database = require('../db.js');
var helper = require('./helper.js');

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

function getMigrationFiles() {
	return new Promise((resolve, reject) => {
		file_names = [];
		fs.readdir(migrationsFolder, async function (error, files) {
			if (error) {
				reject('Unable to scan migrations: ' + error)
			}

			// Build file list
			files.sort(function (a, b) {
				return a < b ? -1 : 1;
			}).forEach(function (migration_file, key) {
				if (blacklist.indexOf(migration_file) >= 0) {
					return;
				}
				file_names.push(migration_file);
			});
		});

		resolve(file_names);
	});
}


module.exports = {
	run: async function () {
		try {
			migrations = await getMigrationFiles();
			users = await helper.getUsers();

			for (user of users) {
				await helper.connect(user);

				// Execute migrations
				for (migration_file of migrations) {
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
								console.error('Error running migration', user, migration_file, error);
								setStatus(user, migration_file, 'FAIL');
							}
						}
					} catch (ex) {
						console.error('Error on HasRun', user, migration_file, ex);
					}

				}
			}
		} catch (ex) {
			console.error('migration', ex);
		}
	},
}
