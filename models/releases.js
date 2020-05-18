const database = require('../db')

module.exports = {
	/**
	 * Get the filter
	 */
	getFilter: function (req) {
		return (req.cookies['filter'] ? JSON.parse(req.cookies['filter']) : {});
	},

	getReleases: function(req, res) {
		return new Promise((resolve, reject) => {
			let extra_query = '';
			if (this.getFilter(req)['album-only'] == true) {
				extra_query = " AND type = 'album'";
			}

			database.executeQuery(`SELECT artist, album, type, release_date FROM Releases WHERE match = 1 ${extra_query} GROUP BY artist, album, type, release_date ORDER BY release_date DESC`, res.locals.username).then(function (releases) {
				resolve(releases);
			}).catch(function(ex) {
				reject(ex);
			})
		});
	}
}
