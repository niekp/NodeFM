var express = require('express');
var router = express.Router();
var stats = require('../models/stats.js')
var createError = require('http-errors');
var pagination = require('../models/pagination.js')

// Only allow logged in sessions
router.get('/*', function (req, res, next) {
	if (!res.locals.loggedIn) {
		res.redirect('/settings/login');
	} else {
		next();
	}
});

router.get('/', function (req, res, next) {
	stats.getRecentTracks(req, res).then(function (data) {
		res.render('stats/recent-tracks', { 
			menu: 'recent', 
			title: 'Recent tracks', 
			tracks: data.results,
			pagination: data.pagination,
			datefilter: true
		});
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/artists', function (req, res, next) {
	stats.getTopArtists(req, res).then(function (data) {
		res.render('stats/top-artists', { 
			menu: 'top-artists', 
			title: 'Top artists', 
			artists: data.results,
			pagination: data.pagination,
			topResult: data.topResult,
			datefilter: true
		});
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/albums', function (req, res, next) {
	stats.getTopAlbums(req, res).then(function (data) {
		res.render('stats/top-albums', { 
			menu: 'top-albums', 
			title: 'Top albums', 
			albums: data.results,
			pagination: data.pagination,
			topResult: data.topResult,
			datefilter: true
		});
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/tracks', function (req, res, next) {
	stats.getTopTracks(req, res).then(function (data) {
		res.render('stats/top-tracks', { 
			menu: 'top-tracks', 
			title: 'Top tracks', 
			tracks: data.results,
			pagination: data.pagination,
			topResult: data.topResult,
			datefilter: true
		});
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/artist-discoveries', function (req, res, next) {
	stats.getTopArtistDiscoveries(req, res).then(function (data) {
		res.render('stats/top-artists', { 
			menu: 'artist-discoveries', 
			title: 'Top artist discoveries', 
			artists: data.results,
			pagination: data.pagination,
			topResult: data.topResult,
			datefilter: true
		});
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/album-discoveries', function (req, res, next) {
	stats.getTopAlbumDiscoveries(req, res).then(function (data) {
		res.render('stats/top-albums', { 
			menu: 'album-discoveries', 
			title: 'Top album discoveries', 
			albums: data.results,
			pagination: data.pagination,
			topResult: data.topResult,
			datefilter: true
		});
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/track-discoveries', function (req, res, next) {
	stats.getTopTrackDiscoveries(req, res).then(function (data) {
		res.render('stats/top-tracks', { 
			menu: 'track-discoveries', 
			title: 'Top track discoveries', 
			tracks: data.results,
			pagination: data.pagination,
			topResult: data.topResult,
			datefilter: true
		});
	}).catch(function (error) {
		next(createError(500, error));
	});
});


router.get('/scrobbles-per-hour', function (req, res, next) {
	pagination.setLimit(24);

	stats.getScrobblesPer(req, res, '%H').then(function (data) {
		res.render('stats/scrobbles-per', { 
			menu: 'scrobbles-per-hour', 
			title: 'Scrobbles per hour', 
			results: data.results,
			topResult: data.topResult,
			formatLabel: 'Hour',
			datefilter: true
		});
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/scrobbles-per-day', function (req, res, next) {
	stats.getScrobblesPer(req, res, '%w').then(function (data) {
		data.results[0].unit = 'Sunday';
		data.results[1].unit = 'Monday';
		data.results[2].unit = 'Tuesday';
		data.results[3].unit = 'Wednesday';
		data.results[4].unit = 'Thursday';
		data.results[5].unit = 'Friday';
		data.results[6].unit = 'Saturday';
		
		res.render('stats/scrobbles-per', { 
			menu: 'scrobbles-per-day', 
			title: 'Scrobbles per day', 
			results: data.results,
			topResult: data.topResult,
			formatLabel: 'Day',
			datefilter: true
		});
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/scrobbles-per-week', function (req, res, next) {
	pagination.setLimit(54);

	stats.getScrobblesPer(req, res, '%W').then(function (data) {
		if (data.results[52]) {
			data.results[0].scrobbles += data.results[52].scrobbles;
			data.results.pop();
		}
		console.log(data.results)

		res.render('stats/scrobbles-per', { 
			menu: 'scrobbles-per-week', 
			title: 'Scrobbles per week', 
			results: data.results,
			topResult: data.topResult,
			pagination: data.pagination,
			formatLabel: 'Week',
			datefilter: true
		});
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/scrobbles-per-month', function (req, res, next) {
	if (res.locals.filter)
		pagination.setLimit(54);

	stats.getScrobblesPer(req, res, '%m').then(function (data) {
		res.render('stats/scrobbles-per', { 
			menu: 'scrobbles-per-month', 
			title: 'Scrobbles per month', 
			results: data.results,
			topResult: data.topResult,
			pagination: data.pagination,
			formatLabel: 'Month',
			datefilter: true
		});
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/scrobbles-per-year', function (req, res, next) {
	stats.getScrobblesPer(req, res, '%Y', 'DESC').then(function (data) {
		res.render('stats/scrobbles-per', { 
			menu: 'scrobbles-per-year', 
			title: 'Scrobbles per year', 
			results: data.results,
			topResult: data.topResult,
			pagination: data.pagination,
			formatLabel: 'Year',
			datefilter: true
		});
	}).catch(function (error) {
		next(createError(500, error));
	});
});


module.exports = router;
