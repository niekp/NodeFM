var database = require('../db.js')
var pagination = require('./pagination.js')


/**
 * Execute an select query and a count query. Return the result and a pagination object.
 * 
 * @param {Request} req 
 * @param {Response} res 
 * @param {string} select - The SELECT ... part of the query
 * @param {string} from_where - The FROM .. WHERE ... part of the query. This is seperated so it can be reused for the COUNT query
 * @param {string} order_by - The ORDER BY ... part of the query. This is seperated because it's not needed in the count
 * @param {string} select_count - If COUNT(*) from_where is not sufficient or not efficient enought pass a complete count query. Note: Define the count `AS count`
 * @returns {Promise} - and in the resolve an object { results: {query result}, pagination: {pagination}, topResult: {top result without pagination} }
 */
function handleStatsRequest(req, res, select, from_where, group_by, order_by, select_count = null, utc_filter = null, top_query_order = null) {
	// Setup the pagination
	pagination.resetDefault();
	pagination.calculate(req);
	
	// Build the default count query of no custom query has been given.
	if (!select_count) {
		select_count = `SELECT COUNT(*) AS count ${from_where}`;
	}

	// Check wether to apply the date-filter
	if (utc_filter !== false && req.query.filter && (req.query.filter['start-date'] || req.query.filter['end-date'])) {		
		// Setup the default UTC filter if no filter is given
		if (utc_filter === null) {
			utc_filter = 'WHERE S.utc >= ${start-date} AND S.utc <= ${end-date}';
			if (from_where.toLowerCase().indexOf('where') >= 0)
				utc_filter = utc_filter.replace('WHERE ', ' AND ');
			if (from_where.toLowerCase().indexOf('S.') < 0)
				utc_filter = utc_filter.replace(/S\./g, '');
		}

		// Prepare the filter query
		utc_filter = prepareUtcWhere(req, res, utc_filter);

		// Append the utc_filter to the select query. Replace the S. out of it because the queries are a lot simpler.
		// This is really not a safe way to do it.. but it works for now ;D
		select_count += ' ' + (utc_filter.replace(/S\./g, ''));
	} else {
		utc_filter = '';
	}


	// Execute the count query
	let count = database.executeQuery(select_count, res.locals.username);

	// Execute the select query
	let results = database.executeQuery(`
		${select}
		${from_where}
		${utc_filter}
		${group_by}
		${order_by}
		LIMIT ${pagination.offset},${pagination.limit}`,
		res.locals.username);
		
	if (!top_query_order) {
		top_query_order = order_by;
	}

	// Get the #1 result, without the limit/offset. Used to show a percentage bar
	let topResult = database.executeQuery(`
		${select}
		${from_where}
		${utc_filter}
		${group_by}
		${top_query_order}
		LIMIT 0, 1`,
		res.locals.username);

	// Wait for the queries and build the response	
	return new Promise((resolve, reject) => {
		data = { results: null, pagination: pagination, topResult: null }

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

		topResult.then(function(value) {
			data.topResult = value[0];
		}).catch(function(error) {
			reject(error);
		});

		// Wait for all and return.
		Promise.all([count, results, topResult]).then(function(values) {
			resolve(data);
		});
	});

}

/**
 * Set de default date of the filter if none is given
 * @param {Request} req 
 * @param {Response} res
 * @param {?string} startdate | as L format
 * @param {?string} enddate | as L format
 */
function setDefaultDate(req, res, startdate = null, enddate = null) {
	if (!req.query.filter) {
		req.query.filter = [];
	}

	if (datefilter = req.cookies['datefilter']) {
		let offset = datefilter.split(' ');
		let offsetAmount = parseInt(offset[0]);
		let offsetUnit = offset[1];

		startdate = req.app.locals.moment().subtract(offsetAmount, offsetUnit).format('L');
	}

	if (startdate && req.query.filter['start-date'] === undefined) {
		req.query.filter['start-date'] = startdate
		res.locals.filter = req.query.filter;
	}
	if (enddate && req.query.filter['end-date'] === undefined) {
		req.query.filter['end-date'] = enddate
		res.locals.filter = req.query.filter;
	}
}

/**
 * Prepare a 'where utc >= ${start-date} and utc <= ${end-date} with the values from the filter
 * @param {Request} req 
 * @param {Response} res 
 * @param {string} where 
 * @returns {string}
 */
function prepareUtcWhere(req, res, where) {
	let startdate = req.app.locals.moment('01-01-1990', "MM-DD-YYYY").format('X');
	let enddate = req.app.locals.moment().format('X');

	if (req.query.filter && req.query.filter['start-date']) {
		startdate = req.app.locals.moment(req.query.filter['start-date'], "DD-MM-YYYY").format('X');
	}
	if (req.query.filter && req.query.filter['end-date']) {
		enddate = req.app.locals.moment(req.query.filter['end-date'] + ' 23:59:59', "DD-MM-YYYY HH:mm:ss").format('X');
	}

	if (startdate && parseInt(enddate) < parseInt(startdate)) {
		enddate = startdate;
		req.query.filter['end-date'] = req.app.locals.moment(enddate, 'X').format('L');
		res.locals.filter = req.query.filter;
	}

	where = where.replace(/\$\{start\-date\}/g, startdate);
	where = where.replace(/\$\{end\-date\}/g, enddate);
	return where
}

module.exports = {
	/**
	 * @param {Request} req 
	 * @param {Response} res
	 * @returns {Promise}
	 * @see handleStatsRequest
	 */
	getRecentTracks: function(req, res) {
		return handleStatsRequest(
			req, res, 
			'SELECT A.name as artist, T.name as track, S.utc', 
			`FROM Scrobble as S 
			INNER JOIN Artist as A on A.id = S.artist_id
			INNER JOIN Track as T on T.id = S.track_id`,
			'',
			'ORDER BY utc DESC',
			'SELECT COUNT(*) AS count FROM scrobble'
		);
	},

	/**
	 * @param {Request} req
	 * @param {Response} res 
	 * @returns {Promise}
	 * @see handleStatsRequest
	 */
	getTopArtists: function(req, res) {
		setDefaultDate(req, res, req.app.locals.moment().subtract(1, 'month').format('L'));

		return handleStatsRequest(
			req, res, 
			'SELECT a.name as artist, count(*) as scrobbles', 
			`FROM Scrobble as S
			INNER JOIN Artist as A on A.id = S.artist_id`,
			'GROUP by A.name',
			'ORDER by count(*) desc',
			'SELECT COUNT(DISTINCT(artist_id)) AS count FROM scrobble'
		);
	},
	
	/**
	 * @param {Request} req 
	 * @param {Response} res
	 * @returns {Promise}
	 * @see handleStatsRequest
	 */
	getTopAlbums: function(req, res) {
		setDefaultDate(req, res, req.app.locals.moment().subtract(1, 'month').format('L'));

		return handleStatsRequest(
			req, res, 
			'SELECT A.name as artist, B.name as album, count(*) as scrobbles', 
			`FROM Scrobble as S
			INNER JOIN Artist as A on A.id = S.artist_id
			INNER JOIN Album as B on B.id = S.album_id`,
			'GROUP by A.name, B.name',
			'ORDER by count(*) desc',
			'SELECT COUNT(DISTINCT(album_id)) AS count FROM scrobble'			
		);
	},

	/**
	 * @param {Request} req 
	 * @param {Response} res 
	 * @returns {Promise}
	 * @see handleStatsRequest
	 */
	getTopTracks: function(req, res) {
		setDefaultDate(req, res, req.app.locals.moment().subtract(1, 'month').format('L'));

		return handleStatsRequest(
			req, res, 
			'SELECT A.name as artist, B.name as album, T.name as track, count(*) as scrobbles', 
			`FROM Scrobble as S
			INNER JOIN Artist as A on A.id = S.artist_id
			INNER JOIN Album as B on B.id = S.album_id
			INNER JOIN Track as T on T.id = S.track_id`,
			'GROUP by S.artist_id, S.album_id, S.track_id',
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
	 * @see handleStatsRequest
	 */
	getTopArtistDiscoveries: function(req, res) {
		setDefaultDate(req, res, req.app.locals.moment().subtract(180, 'days').format('L'));

		return handleStatsRequest(
			req, res, 
			'SELECT A.name as artist, count(*) as scrobbles', 
			`FROM Scrobble as S
			INNER JOIN Artist as A on A.id = S.artist_id`,
			'GROUP by S.artist_id',
			'ORDER by count(*) desc',

			'SELECT COUNT(DISTINCT(artist_id)) AS count FROM scrobble', 

			// TODO: instead of filtering out all artist listened to before, only filter them if they have more then 10 scrobbles.
			// Otherwise artists that you've encountered once in a playlist but only later discovered are excluded
			'WHERE utc >= ${start-date} AND utc <= ${end-date} '+
			'AND S.artist_id  not in ('+
				'SELECT DISTINCT(artist_id) AS record FROM Scrobble WHERE utc < ${start-date}'+
			')'
		);
	},

	/**
	 * Get the top albums listened in the past 180 days and not listened before that.
	 * So you get the discoveries of the past 180 days.
	 * 
	 * @param {Request} req
	 * @param {Response} res
	 * @returns {Promise}
	 * @see handleStatsRequest
	 */
	getTopAlbumDiscoveries: function(req, res) {
		setDefaultDate(req, res, req.app.locals.moment().subtract(180, 'days').format('L'));
		
		return handleStatsRequest(
			req, res, 
			'SELECT A.name as artist, B.name as album, count(*) as scrobbles', 
			`FROM Scrobble as S
			INNER JOIN Artist as A on A.id = S.artist_id
			INNER JOIN Album as B on B.id = S.album_id`,
			'GROUP by s.artist_id, s.album_id',
			'ORDER by count(*) desc',

			`SELECT COUNT(DISTINCT(artist_id)) AS count 
			FROM scrobble`,
			'WHERE utc >= ${start-date} AND utc <= ${end-date} '+
			'AND (S.artist_id || \'-\' || S.album_id) not in ('+
				'SELECT DISTINCT(artist_id || \'-\' || album_id) AS record FROM Scrobble WHERE utc < ${start-date}'+
			')'
		);
	},

	/**
	 * Get the top tracks listened in the past 180 days and not listened before that.
	 * So you get the discoveries of the past 180 days.
	 * 
	 * @param {Request} req
	 * @param {Response} res
	 * @returns {Promise}
	 * @see handleStatsRequest
	 */
	getTopTrackDiscoveries: function(req, res) {
		setDefaultDate(req, res, req.app.locals.moment().subtract(180, 'days').format('L'));
		
		return handleStatsRequest(
			req, res, 
			'SELECT A.name as artist, B.name as album, T.name as track, count(*) as scrobbles', 
			`FROM Scrobble as S
			INNER JOIN Artist as A on A.id = S.artist_id
			INNER JOIN Album as B on B.id = S.album_id
			INNER JOIN Track as T on T.id = S.track_id`,
			'GROUP by s.artist_id, s.album_id, S.track_id',
			'ORDER by count(*) desc',

			`SELECT COUNT(DISTINCT(artist_id)) AS count 
			FROM scrobble`,
			'WHERE utc >= ${start-date} AND utc <= ${end-date} '+
			'AND (S.artist_id || \'-\' || S.album_id|| \'-\' || S.track_id) not in ('+
				'SELECT DISTINCT(artist_id || \'-\' || album_id|| \'-\' || track_id) AS record FROM Scrobble WHERE utc < ${start-date}'+
			')'
		);
	},

	/**
	 * Top scrobbles per hour, month, ... whatever you put into format
	 * 
	 * @param {Request} req 
	 * @param {Response} res 
	 * @param {string} format - sqlite strftime format like %H, %Y
	 * @param {*} orderDirection - ASC or DESC
	 */
	getScrobblesPer: function(req, res, format, orderDirection = 'ASC') {
		return new Promise((resolve, reject) => {
			handleStatsRequest(
				req, res,
				`SELECT STRFTIME('${format}', DATETIME(utc, 'unixepoch')) AS \`unit\`, COUNT(*) AS scrobbles`,
				'FROM Scrobble',
				'GROUP BY `unit`',
				`ORDER BY STRFTIME('${format}', DATETIME(utc, 'unixepoch')) ${orderDirection}`,
				`SELECT COUNT(DISTINCT(STRFTIME('${format}', DATETIME(utc, 'unixepoch')))) 'count' FROM Scrobble`
			).then(function (data) {
				// Fix the top result
				data.results.forEach(function(record) {
					if (record.scrobbles > data.topResult.scrobbles) {
						data.topResult = record;
					}
				});

				resolve(data);
			}).catch(function(error) {reject(error)});

		});
	},

	/**
	 * Get the top artists that haven't got any scrobbles since the end-date. 
	 * @param {Request} req 
	 * @param {Response} res 
	 * @returns {Promise}
	 * @see handleStatsRequest
	 */
	getBlastsFromThePast: function(req, res) {
		setDefaultDate(req, res, 
			null,
			req.app.locals.moment().subtract(1, 'year').format('L'));

		let where = prepareUtcWhere(req, res, 'WHERE S.utc >= ${start-date} AND utc <= ${end-date}');

		return handleStatsRequest(
			req, res, 
			'SELECT A.name as artist, count(*) as scrobbles, (SELECT utc FROM Scrobble as S2 WHERE S2.artist_id = S.artist_id ORDER BY utc DESC LIMIT 0, 1) AS lastscrobble', 
			`FROM Scrobble as S
			INNER JOIN Artist as A on A.id = S.artist_id
			${where}`,
			'GROUP by S.artist_id',
			'ORDER by count(*) desc',

			'SELECT COUNT(DISTINCT(artist_id)) AS count FROM scrobble AS S INNER JOIN Artist as A on A.id = s.artist_id', 

			'AND '+
			' A.name NOT IN ('+
				'SELECT DISTINCT(A.name) AS record FROM Scrobble AS S '+
				'INNER JOIN Artist as A on A.id = S.artist_id '+
				'WHERE utc > ${end-date}'+
			')'
		);
	},
	
	/**
	 * Get the top artists per period.
	 * Based on data filled with /cronjobs/timeline.js
	 * @param {Request} req 
	 * @param {Response} res 
	 * @returns {Promise}
	 * @see handleStatsRequest
	 */
	getTimeline: function(req, res, format = '%Y-%m') {
		return handleStatsRequest(
			req, res, 
			'SELECT period, artist, scrobbles', 
			`FROM ArtistTimeline WHERE format = '${format}'`,
			'',
			'ORDER BY period DESC',
			`SELECT COUNT(*) AS count FROM ArtistTimeline WHERE format = '${format}'`, null, 
			'ORDER BY scrobbles DESC'
		);
	},

}

