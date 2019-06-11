var helper = require('./helper.js');
var db = require('../db.js');
/**
 * @param {string} user 
 */
function Migration(user) {
	migration_helper = new helper(user);

	this.run = async function() {
		// Album fields
		await (migration_helper.addColumn('Album', 'musicbrainz_last_search', 'datetime'));
		await (migration_helper.addColumn('Album', 'mbid', 'text'));
		await (migration_helper.addColumn('Album', 'release_date', 'date'));

		// Track fields
		await (migration_helper.addColumn('Track', 'musicbrainz_last_search', 'datetime'));
		await (migration_helper.addColumn('Track', 'mbid', 'text'));
		await (migration_helper.addColumn('Track', 'duration', 'int'));
		await (migration_helper.addColumn('Track', 'track_number', 'int'));
		
		// Artist fields
		await (migration_helper.addColumn('Artist', 'musicbrainz_last_search', 'datetime'));
		await (migration_helper.addColumn('Artist', 'mbid', 'text'));
	}
};


module.exports = Migration;
