var helper = require('./helper.js');

/**
 * @param {string} user 
 */
function Migration(user) {
	migration_helper = new helper(user);

	this.run = async function () {
		await migration_helper.addTable('Spotify',
			'CREATE TABLE Spotify (id INTEGER PRIMARY KEY, code string, refresh_token string, token string, token_expires DATETIME, username string)'
		);
		await migration_helper.executeQuery("DELETE FROM Spotify");
		await migration_helper.executeQuery("INSERT INTO Spotify (code) values ('')");
	}
};


module.exports = Migration;
