const helper = require('./helper');

/**
 * @param {string} user 
 */
function Migration(user) {
	migration_helper = new helper(user);

	this.run = async function () {
			
		await migration_helper.executeQuery(`
		CREATE INDEX Scrobble_id_IDX ON Scrobble (id);
		CREATE INDEX Scrobble_track_id_IDX ON Scrobble (track_id,artist_id,album_id);
		CREATE INDEX Artist_id_IDX ON Artist (id);
		CREATE INDEX Album_id_IDX ON Album (id);
		CREATE INDEX Track_id_IDX ON Track (id);
		`);
	}
};


module.exports = Migration;
