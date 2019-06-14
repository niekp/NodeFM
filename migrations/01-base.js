var helper = require('./helper.js');

/**
 * Add the migration table so future migrations can be automaticly run.
 * @param {string} user 
 */
function Migration(user) {
	migration_helper = new helper(user);

	this.run = async function() {

		await (migration_helper.addTable('Artist',
			'CREATE TABLE Artist (id INTEGER PRIMARY KEY AUTOINCREMENT, name text)'));

		await (migration_helper.addTable('Album',
			'CREATE TABLE Album (id INTEGER PRIMARY KEY AUTOINCREMENT, artist_id INTEGER, name text)'));

		await (migration_helper.addTable('Track',
			'CREATE TABLE Track (id INTEGER PRIMARY KEY AUTOINCREMENT, artist_id INTEGER, album_id INTEGER, name text)'));

		await (migration_helper.addTable('Scrobble',
			'CREATE TABLE Scrobble (id INTEGER PRIMARY KEY AUTOINCREMENT, utc datetime, track_id INTEGER, artist_id INTEGER, album_id INTEGER)'));

		await (migration_helper.addTable('Status',
			'CREATE TABLE Status (lastsync datetime, page int)'));
	}
};


module.exports = Migration;
