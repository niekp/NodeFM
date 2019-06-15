const helper = require('./helper');
var db = require('../db.js');
/**
 * @param {string} user 
 */
function Migration(user) {
	migration_helper = new helper(user);

	this.run = async function() {
		await migration_helper.addColumn('ArtistTimeline', 'format', 'text');
		await db.executeQuery('DELETE FROM ArtistTimeline', user);
		await db.executeQuery("DELETE FROM Cronjob WHERE key = 'timeline'", user);
	}
};


module.exports = Migration;
