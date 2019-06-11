var helper = require('./helper.js');

/**
 * Add a ArtistTimeline table to keep caluclated data.
 * Filled with /cronjobs/timeline and visible through stats/timeline
 * @param {string} user 
 */
function Migration(user) {
	migration_helper = new helper(user);

	this.run = async function() {
		await migration_helper.addTable('ArtistTimeline', 
			'CREATE TABLE ArtistTimeline (id INTEGER PRIMARY KEY, artist text, period text, scrobbles int)');
	}
};


module.exports = Migration;
