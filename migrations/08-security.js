const helper = require('./helper');

/**
 * @param {string} user 
 */
function Migration(user) {
	migration_helper = new helper(user);

	this.run = async function () {
		await (migration_helper.addTable('Security',
			'CREATE TABLE Security (id INTEGER PRIMARY KEY, password string)'
		));
		await (migration_helper.addTable('Session',
			'CREATE TABLE Session (id INTEGER PRIMARY KEY, hash string, expires_on datetime)'
		));
	}
};


module.exports = Migration;
