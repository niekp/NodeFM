var express = require('express');
var router = express.Router();
var spotify_helper = require('../models/spotify_helper.js')
var spotify = require('../models/spotify.js')

// Only allow logged in sessions
router.get('/*', function (req, res, next) {
	if (!res.locals.loggedIn) {
		res.redirect('/settings/login');
	} else {
		next();
	}
});

/**
 * Authentication routes
 */
router.get('/authenticate', function (req, res, next) {
	url = spotify_helper.getAuthorizeUrl(req, res);
	if (url) {
		res.redirect(url);
	} else {
		res.render('spotify/authenticate', {
			error: true
		});
	}
});

router.get('/authenticate/callback', function (req, res, next) {
	spotify_helper.handleCallback(req, res).then(function () {
		res.redirect('/settings');
	}).catch(function () {
		res.render('spotify/authenticate', {
			error: true
		});
	})
});

router.get('/authenticate/unlink', function (req, res, next) {
	spotify_helper.unlink(req, res).then(function () {
		res.redirect('/settings');
	}).catch(function () {
		res.render('spotify/authenticate', {
			error: true
		});
	})
});

/**
 * Control routes
 */
router.get('/control/next', function (req, res, next) {
	spotify.next(req, res);

	res.render('spotify/authenticate', {

	});
});

router.get('/control/play', function (req, res, next) {
	spotify.play(req, res).then(function () {
		res.json({ success: true });
	}).catch(function(ex) {
		res.json({ success: false, error: ex });
	})
});

module.exports = router;
