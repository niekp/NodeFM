var helper = require('./helper.js');

/**
 * @param {string} user 
 */
function Migration(user) {
	migration_helper = new helper(user);

	this.run = async function () {
		await (migration_helper.executeQuery(`CREATE INDEX Scrobble_utc_IDX ON Scrobble (utc DESC)`));
		await (migration_helper.executeQuery(`CREATE INDEX Scrobble_track_id_IDX ON Scrobble (track_id,artist_id,album_id)`));
		await (migration_helper.executeQuery(`CREATE INDEX Artist_id_IDX ON Artist (id)`));
		await (migration_helper.executeQuery(`CREATE INDEX Album_id_IDX ON Album (id)`));
		await (migration_helper.executeQuery(`CREATE INDEX Track_id_IDX ON Track (id)`));
		await (migration_helper.executeQuery(`CREATE INDEX Artist_name_IDX ON Artist(name)`));
		await (migration_helper.executeQuery(`CREATE INDEX Album_name_IDX ON Album(name)`));
	}
};


module.exports = Migration;
