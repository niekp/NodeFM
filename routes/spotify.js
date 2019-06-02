var express = require('express');
var router = express.Router();
var spotify_helper = require('../models/spotify_helper.js')
var spotify = require('../models/spotify.js')
var security = require('../models/security.js')
var cache_helper = require('../models/cache_helper.js')

// Only allow logged in sessions
router.get('/*', function (req, res, next) {
	if (!res.locals.loggedIn) {
		res.redirect('/settings/login');
	} else {
		security.isUnlocked(req, res).then(function(unlocked) {
			if (unlocked) {
				next();
			} else {
				res.redirect('/security/unlock');
			}
		});
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
 * List routes
 */
 router.get('/releases', function (req, res, next) {
	 spotify.getReleases(req, res).then(function (releases) {
		 res.render('spotify/releases', {
			 menu: 'releases',
			 title: 'New releases',
			 releases: releases,
			 album_only: req.cookies['new-releases-album-only']
		 });
	 });
 });

/**
 * Control routes
 */
router.get('/control/nowplaying', function (req, res, next) {
	let cache_expires = cache_helper.getExpiresSeconds('1min');
	let cache_key = res.locals.username + ':now_playing';

	if (req.query.force) {
		spotify.nowplaying(res.locals.username).then(function (data) {
			cache_helper.save(cache_key, data, cache_expires, 'json');
			res.json(data);
		}).catch(function (ex) {
			cache_helper.save(cache_key, {}, cache_expires, 'json');
			res.json({ error: ex });
		});
		
	} else {
		cache_helper.get(cache_key).then(function (data) {
			res.json(data);
		}).catch(function (ex) {
			spotify.nowplaying(res.locals.username).then(function (data) {
				cache_helper.save(cache_key, data, cache_expires, 'json');
				res.json(data);
			}).catch(function (ex) {
				console.error(ex);
				res.json({ error: ex });
			});
		});
	}
	

});

router.get('/control/next', function (req, res, next) {
	spotify.next(req, res);
	res.json({ ok: true });
});

router.get('/control/prev', function (req, res, next) {
	spotify.prev(req, res);
	res.json({ ok: true });
});

router.get('/control/play', function (req, res, next) {
	spotify.play(req, res).then(function () {
		res.json({ success: true });
	}).catch(function(ex) {
		res.json({ success: false, error: ex });
	})
});

module.exports = router;
