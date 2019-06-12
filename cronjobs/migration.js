var fs = require('graceful-fs')
const path = require('path');
var database = require('../db.js');
var helper = require('./helper.js');
var logger = require('../models/logger.js');
var logger = require('../models/logger.js');

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
    database.executeQuery(`INSERT INTO Migration (name, status, utc) VALUES('${migration_file}', '${status}', CURRENT_TIMESTAMP)`, user).catch(function(ex) {
		logger.log(logger.ERROR, `set migration status ${user}`, ex);
		
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
								logger.log(logger.INFO, `Run migration\t${user}\t${migration_file}`);
								await runner.run();
								setStatus(user, migration_file, 'SUCCESS');
							} catch (ex) {
								logger.log(logger.ERROR, `error running migration ${user} ${migration_file}`, ex);
								setStatus(user, migration_file, 'FAIL');
							}
						}
					} catch (ex) {
						logger.log(logger.ERROR, `Error on HasRun\t${user}\t${migration_file}`, ex);
					}

				}
			}
		} catch (ex) {
			logger.log(logger.ERROR, `migration`, ex);
		}
	},
}
