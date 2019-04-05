var express = require('express');
var router = express.Router();
var stats = require('../models/stats.js')
var createError = require('http-errors');

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

router.get('/artist-discoveries', function (req, res, next) {
	stats.getTopArtistDiscoveries(req, res).then(function (data) {
		res.render('stats/top-artists', { 
			menu: 'artist-discoveries', 
			title: 'Top artist discoveries in the past 180 days', 
			artists: data.results,
			pagination: data.pagination,
			topResult: data.topResult
		});
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/album-discoveries', function (req, res, next) {
	stats.getTopAlbumDiscoveries(req, res).then(function (data) {
		res.render('stats/top-albums', { 
			menu: 'album-discoveries', 
			title: 'Top album discoveries in the past 180 days', 
			albums: data.results,
			pagination: data.pagination,
			topResult: data.topResult
		});
	}).catch(function (error) {
		next(createError(500, error));
	});
});

module.exports = router;
