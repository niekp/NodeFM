var helper = require('./helper.js');

/**
 * @param {string} user 
 */
function Migration(user) {
	migration_helper = new helper(user);

	this.run = async function () {
		await migration_helper.addTable('Releases',
			'CREATE TABLE Releases (id INTEGER PRIMARY KEY, artist string, album string, image string, type string, uri string, release_date date, match tinyint)'
		);
	}
};


module.exports = Migration;
