var express = require('express');
var router = express.Router();
var stats = require('../models/stats.js')
var createError = require('http-errors');

router.get('/', function (req, res, next) {
	stats.getRecentTracks().then(function (tracks) {
		res.render('stats/recent-tracks', { menu: 'recent', title: 'Recent tracks', tracks: tracks })
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/artists', function (req, res, next) {
	stats.getTopArtists().then(function (tracks) {
		res.render('stats/top-artists', { menu: 'top-artists', title: 'Top 10 artists', tracks: tracks })
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/albums', function (req, res, next) {
	stats.getTopAlbums().then(function (tracks) {
		res.render('stats/top-albums', { menu: 'top-albums', title: 'Top 10 albums', tracks: tracks })
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/artist-discoveries', function (req, res, next) {
	stats.getTopArtistDiscoveries().then(function (tracks) {
		res.render('stats/top-artists', { menu: 'artist-discoveries', title: 'Top artist discoveries in the past 180 days', tracks: tracks })
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/album-discoveries', function (req, res, next) {
	stats.getTopAlbumDiscoveries().then(function (tracks) {
		res.render('stats/top-albums', { menu: 'album-discoveries', title: 'Top album discoveries in the past 180 days', tracks: tracks })
	}).catch(function (error) {
		next(createError(500, error));
	});
});

module.exports = router;
