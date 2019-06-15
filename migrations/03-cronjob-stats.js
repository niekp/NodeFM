const helper = require('./helper');

/**
 * @param {string} user 
 */
function Migration(user) {
	migration_helper = new helper(user);

	this.run = async function() {
		await migration_helper.addTable('Cronjob', 
			'CREATE TABLE Cronjob (id INTEGER PRIMARY KEY, key string, utc datetime DEFAULT CURRENT_TIMESTAMP, status text, info text)');
	}
};


module.exports = Migration;
