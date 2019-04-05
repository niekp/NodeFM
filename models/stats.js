var database = require('../db.js')
var pagination = require('./pagination.js')

module.exports = {
	
	/**
	 * Execute an select query and a count query. Return the result and a pagination object.
	 * 
	 * @param {Request} req 
	 * @param {Response} res 
	 * @param {string} select - The SELECT ... part of the query
	 * @param {string} from_where - The FROM .. WHERE ... part of the query. This is seperated so it can be reused for the COUNT query
	 * @param {string} order_by - The ORDER BY ... part of the query. This is seperated because it's not needed in the count
	 * @param {string} select_count - If COUNT(*) from_where is not sufficient or not efficient enought pass a complete count query. Note: Define the count `AS count`
	 * @returns {Promise}
	 */
	handleStatsRequest(req, res, select, from_where, order_by, select_count = null) {
		// Setup the pagination
		pagination.resetDefault();
		pagination.calculate(req);
		
		// Build the default count query of no custom query has been given.
		if (!select_count) {
			select_count = `SELECT COUNT(*) AS count ${from_where}`;
		}

		// Execute the count query
		var count = database.executeQuery(select_count, res.locals.username);

		// Execute the select query
		var results = database.executeQuery(`
			${select}
			${from_where}
			${order_by}
			LIMIT ${pagination.offset},${pagination.limit}`,
			res.locals.username);
			
		// Wait for the queries and build the response	
		return new Promise((resolve, reject) => {
			data = { results: null, pagination: pagination }

				// Add the results to the pagination and recalculate
			count.then(function(value) {
				data.pagination.recordCount = value[0].count;
				data.pagination.calculate(req);
			}).catch(function(error) {
				reject(error);
			});

			// Add the query results to the response.
			results.then(function(value) {
				data.results = value;
			}).catch(function(error) {
				reject(error);
			});

			// Wait for all and return.
			Promise.all([count, results]).then(function(values) {
				resolve(data);
			});
		});

	},

	/**
	 * @param {Request} req 
	 * @param {Response} res 
	 * @returns {Promise}
	 */
	getRecentTracks: function(req, res) {
		return this.handleStatsRequest(
			req, res, 
			'SELECT A.name as artist, T.name as track, S.utc', 
			`FROM Scrobble as S 
			INNER JOIN Artist as A on A.id = S.artist_id
			INNER JOIN Track as T on T.id = S.track_id`,
			'ORDER BY utc DESC',
			'SELECT COUNT(*) AS count FROM scrobble'
		);
	},

	/**
	 * @param {Request} req
	 * @param {Response} res 
	 * @returns {Promise}	 * 
	 */
	getTopArtists: function(req, res) {
		return this.handleStatsRequest(
			req, res, 
			'SELECT a.name as artist, count(*) as scrobbles', 
			`FROM Scrobble as S
			INNER JOIN Artist as A on A.id = S.artist_id
			GROUP by s.artist_id`,
			'ORDER by count(*) desc',
			'SELECT COUNT(DISTINCT(artist_id)) AS count FROM scrobble'
		);
	},
	
	/**
	 * @param {Request} req 
	 * @param {Response} res
	 * @returns {Promise}
	 */
	getTopAlbums: function(req, res) {
		return this.handleStatsRequest(
			req, res, 
			'SELECT A.name as artist, B.name as album, count(*) as scrobbles', 
			`FROM Scrobble as S
			INNER JOIN Artist as A on A.id = S.artist_id
			INNER JOIN Album as B on B.id = S.album_id
			GROUP by S.artist_id, S.album_id`,
			'ORDER by count(*) desc',
			'SELECT COUNT(DISTINCT(album_id)) AS count FROM scrobble'
		);
	},

	/**
	 * Get the top artists listened in the past 180 days and not listened before that.
	 * So you get the discoveries of the past 180 days.
	 * 
	 * @param {Request} req 
	 * @param {Response} res
	 * @returns {Promise}
	 */
	getTopArtistDiscoveries: function(req, res) {
		return this.handleStatsRequest(
			req, res, 
			'SELECT A.name as artist, count(*) as scrobbles', 
			`FROM Scrobble as S
			INNER JOIN Artist as A on A.id = S.artist_id
			WHERE utc >= strftime('%s', datetime('now', '-180 day'))
			AND S.artist_id not in (
				select distinct(artist_id) from Scrobble where utc < strftime('%s', datetime('now', '-180 day'))
			)
			GROUP by S.artist_id`,
			'ORDER by count(*) desc',

			`SELECT COUNT(DISTINCT(artist_id)) AS count 
			FROM scrobble 
			WHERE utc >= strftime('%s', datetime('now', '-180 day'))
			AND artist_id NOT IN (
				SELECT DISTINCT(artist_id) FROM Scrobble WHERE utc < strftime('%s', datetime('now', '-180 day'))
			)`
		);
	},

	/**
	 * Get the top albums listened in the past 180 days and not listened before that.
	 * So you get the discoveries of the past 180 days.
	 * 
	 * @param {Request} req
	 * @param {Response} res
	 * @returns {Promise}
	 */
	getTopAlbumDiscoveries: function(req, res) {
		return this.handleStatsRequest(
			req, res, 
			'SELECT A.name as artist, B.name as album, count(*) as scrobbles', 
			`FROM Scrobble as S
			INNER JOIN Artist as A on A.id = S.artist_id
			INNER JOIN Album as B on B.id = S.album_id
			WHERE utc >= strftime('%s', datetime('now', '-180 day'))
			and (s.artist_id || '-' || s.album_id) not in (
				select distinct(artist_id || '-' || album_id) as record from Scrobble where utc < strftime('%s', datetime('now', '-180 days'))
			)
			GROUP by s.artist_id, s.album_id`,
			'ORDER by count(*) desc',

			`SELECT COUNT(DISTINCT(artist_id)) AS count 
			FROM scrobble 
			WHERE utc >= strftime('%s', datetime('now', '-180 day'))
			AND (artist_id || '-' || album_id) not in (
				SELECT DISTINCT(artist_id || '-' || album_id) AS record FROM Scrobble WHERE utc < strftime('%s', datetime('now', '-180 days'))
			)`
		);
	},

}

