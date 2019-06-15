const express = require('express');
const router = express.Router();
const library = require('../models/library');
const createError = require('http-errors');
const cache_helper = require('../models/cache_helper')
const cache = cache_helper.getRedis();

cache.on('error', function (error) { });

// Only allow logged in sessions
router.get('/', function (req, res, next) {
	if (!res.locals.loggedIn) {
		if (req.xhr) {
			res.json({error: 'not authorized'});
		} else {
			res.redirect('/settings/login');
		}
	} else {
		next();
	}
});

router.get('/artist/:artist', 
	function (req, res, next) { cache_helper.setCacheName(req, res, next); },
	cache.route(cache_helper.getExpires('week')),
	function (req, res, next) {
		
		library.getAlbums(req.params.artist, null, req, res).then(function (albums) {
			data = {
				menu: 'library',
				artist: req.params.artist,
				albums: data.results,
				pagination: data.pagination,
				topResult: data.topResult,
				datefilter: false,
				modal: (req.query.modal == '1' ? true : false)
			}
			if (req.xhr && !req.query.modal) {
				res.json(data);
			} else {
				res.render('library/artist', data);
			}
		}).catch(function (error) {
			next(createError(500, error));
		});
	}
);

module.exports = router;
