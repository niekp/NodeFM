var express = require('express');
var router = express.Router();
var stats = require('../models/stats.js')

router.get('/', function (req, res) {
	stats.getRecentTracks().then(function (tracks) {
		res.render('stats/recent-tracks', { title: 'Recent tracks', tracks: tracks })
	}).catch(function (error) {
		res.render('oops', { error: error })
	});
});

router.get('/artists', function (req, res) {
	stats.getTopArtists().then(function (tracks) {
		res.render('stats/top-artists', { title: 'Top 10 artists', tracks: tracks })
	}).catch(function (error) {
		res.render('oops', { error: error })
	});
});

router.get('/albums', function (req, res) {
	stats.getTopAlbums().then(function (tracks) {
		res.render('stats/top-albums', { title: 'Top 10 albums', tracks: tracks })
	}).catch(function (error) {
		res.render('oops', { error: error })
	});
});

module.exports = router;
