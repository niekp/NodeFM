const helper = require('./helper');
var db = require('../db.js');
/**
 * @param {string} user 
 */
function Migration(user) {
	migration_helper = new helper(user);

	this.run = async function() {
		await migration_helper.executeQuery("DELETE FROM Cronjob WHERE key = 'timeline' AND STATUS = 'SUCCESS'");
	}
};


module.exports = Migration;
