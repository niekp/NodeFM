const express = require('express');
const router = express.Router();
const library = require('../models/library');
const createError = require('http-errors');
const cache_helper = require('../models/cache_helper')
const cache = cache_helper.getRedis();

cache.on('error', function (error) { });

// Only allow logged in sessions
router.get('/*', function (req, res, next) {
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

router.get('/artists',
	function (req, res, next) { 
		// Don't cache if 'random order' is chosen.
		if (library.getFilter(req)['random-order'])
			res.use_express_redis_cache = false;
		
		cache_helper.setCacheName(req, res, next); 
	},
	cache.route(cache_helper.getExpires('half-day')),
	function (req, res, next) {
		library.getArtists(req, res).then(function (data) {
			data = {
				menu: 'library-artists',
				title: 'Artists',
				artists: data.results,
				pagination: data.pagination,
				topResult: data.topResult,
				datefilter: true,
				filters: library.getFilter(req)
			}

			if (req.xhr) {
				res.json(data);
			} else {
				res.render('library/artists', data);
			}
		}).catch(function (error) {
			next(createError(500, error));
		});
	}
);

router.get('/albums',
	function (req, res, next) {
		// Don't cache if 'random order' is chosen.
		if (library.getFilter(req)['random-order'])
			res.use_express_redis_cache = false;

		cache_helper.setCacheName(req, res, next);
	},
	function (req, res, next) {
		library.getAlbums(req, res).then(function (data) {
			data = {
				menu: 'library-albums',
				title: 'Albums',
				albums: data.results,
				pagination: data.pagination,
				topResult: data.topResult,
				datefilter: true,
				filters: library.getFilter(req)
			}

			if (req.xhr) {
				res.json(data);
			} else {
				res.render('library/albums', data);
			}
		}).catch(function (error) {
			next(createError(500, error));
		});
	}
);

router.get('/artist', 
	function (req, res, next) { cache_helper.setCacheName(req, res, next); },
	cache.route(cache_helper.getExpires('week')),
	function (req, res, next) {
		
		library.getArtistAlbums(req.query['artist'], null, req, res).then(function (albums) {
			data = {
				menu: 'library',
				artist: req.query['artist'],
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
