const helper = require('./helper');
/**
 * @param {string} user 
 */
function Migration(user) {
	migration_helper = new helper(user);

	this.run = async function () {
		await migration_helper.addTable('Images',
			'CREATE TABLE Images (id INTEGER PRIMARY KEY AUTOINCREMENT, type string, link_id int, source string, url string, key string)'
			);
	}
};


module.exports = Migration;
