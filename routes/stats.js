var express = require('express');
var router = express.Router();
var stats = require('../models/stats.js')
var createError = require('http-errors');
var pagination = require('../models/pagination.js')
var cache_helper = require('../models/cache_helper.js')
var cache = require('express-redis-cache')({ prefix: cache_helper.getPrefix() });

// Only allow logged in sessions
router.get('/*', function (req, res, next) {
	if (!res.locals.loggedIn) {
		res.redirect('/settings/login');
	} else {
		next();
	}
});

router.get('/', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('1min')), 
	function (req, res, next) {
	stats.getRecentTracks(req, res).then(function (data) {
		data = {
			menu: 'recent',
			title: 'Recent tracks',
			tracks: data.results,
			pagination: data.pagination,
			datefilter: true
		}
		if (req.xhr) {
			res.json(data);
		} else {
			res.render('stats/recent-tracks', data);
		}
	}).catch(function (error) {
		next(createError(500, error));
	});
});

router.get('/artists', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('half-day')), 
	function (req, res, next) {
		stats.getTopArtists(req, res).then(function (data) {
			data = {
				menu: 'top-artists',
				title: 'Top artists',
				artists: data.results,
				pagination: data.pagination,
				topResult: data.topResult,
				datefilter: true
			}

			if (req.xhr) {
				res.json(data);
			} else {
				res.render('stats/top-artists', data);
			}
		}).catch(function (error) {
			next(createError(500, error));
		});
	}
);

router.get('/albums', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('half-day')), 
	function (req, res, next) {
		stats.getTopAlbums(req, res).then(function (data) {
			data = {
				menu: 'top-albums',
				title: 'Top albums',
				albums: data.results,
				pagination: data.pagination,
				topResult: data.topResult,
				datefilter: true
			}
			if (req.xhr) {
				res.json(data);
			} else {
				res.render('stats/top-albums', data);
			}
		}).catch(function (error) {
			next(createError(500, error));
		});
	}
);

router.get('/tracks',
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('half-day')), 
	function (req, res, next) {
		stats.getTopTracks(req, res).then(function (data) {
			data = {
				menu: 'top-tracks',
				title: 'Top tracks',
				tracks: data.results,
				pagination: data.pagination,
				topResult: data.topResult,
				datefilter: true
			}
			if (req.xhr) {
				res.json(data);
			} else {
				res.render('stats/top-tracks', data);
			}
		}).catch(function (error) {
			next(createError(500, error));
		});
	}
);

router.get('/artist-discoveries', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('half-day')), 
	function (req, res, next) {
		stats.getTopArtistDiscoveries(req, res).then(function (data) {
			data = {
				menu: 'artist-discoveries',
				title: 'Top artist discoveries',
				artists: data.results,
				pagination: data.pagination,
				topResult: data.topResult,
				datefilter: true
			}
			if (req.xhr) {
				res.json(data);
			} else {
				res.render('stats/top-artists', data);
			}
		}).catch(function (error) {
			next(createError(500, error));
		});
	}
);

router.get('/album-discoveries', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('half-day')), 
	function (req, res, next) {
		stats.getTopAlbumDiscoveries(req, res).then(function (data) {
			data = {
				menu: 'album-discoveries',
				title: 'Top album discoveries',
				albums: data.results,
				pagination: data.pagination,
				topResult: data.topResult,
				datefilter: true
			}
			if (req.xhr) {
				res.json(data);
			} else {
				res.render('stats/top-albums', data);
			}
		}).catch(function (error) {
			next(createError(500, error));
		});
	}
);

router.get('/track-discoveries', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('half-day')), 
	function (req, res, next) {
		stats.getTopTrackDiscoveries(req, res).then(function (data) {
			data = {
				menu: 'track-discoveries',
				title: 'Top track discoveries',
				tracks: data.results,
				pagination: data.pagination,
				topResult: data.topResult,
				datefilter: true
			}
			if (req.xhr) {
				res.json(data);
			} else {
				res.render('stats/top-tracks', data);
			}
		}).catch(function (error) {
			next(createError(500, error));
		});
	}
);


// Block AJAX from here
router.get('/*', function (req, res, next) {
	if (req.xhr) {
		res.json({blocked: true});
	} else {
		next();
	}
});

router.get('/scrobbles-per-hour', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('week')), 
	function (req, res, next) {
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
	}
);

router.get('/scrobbles-per-day', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('half-hour')), 
	function (req, res, next) {
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
	}
);

router.get('/scrobbles-per-week', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('hour')), 
	function (req, res, next) {
		
		pagination.setLimit(54);

		stats.getScrobblesPer(req, res, '%W').then(function (data) {
			if (data.results[52]) {
				data.results[0].scrobbles += data.results[52].scrobbles;
				data.results.pop();
			}

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
}
);

router.get('/scrobbles-per-month', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('day')), 
	function (req, res, next) {
		stats.getScrobblesPer(req, res, '%m').then(function (data) {
			data.results[0].unit = 'Januari';
			data.results[1].unit = 'Februari';
			data.results[2].unit = 'March';
			data.results[3].unit = 'April';
			data.results[4].unit = 'May';
			data.results[5].unit = 'June';
			data.results[6].unit = 'Juli';
			data.results[7].unit = 'August';
			data.results[8].unit = 'September';
			data.results[9].unit = 'October';
			data.results[10].unit = 'November';
			data.results[11].unit = 'December';
			
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
	}
);

router.get('/scrobbles-per-year', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('day')), 
	function (req, res, next) {
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
	}
);

router.get('/blasts-from-the-past', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('day')), 
	function (req, res, next) {
		stats.getBlastsFromThePast(req, res).then(function (data) {
			res.render('stats/blasts-from-the-past', { 
				menu: 'blasts-from-the-past', 
				title: 'Blasts from the past', 
				artists: data.results,
				topResult: data.topResult,
				pagination: data.pagination,
				datefilter: true
			});
		}).catch(function (error) {
			next(createError(500, error));
		});
	}
);

router.get('/timeline-month', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('day')), 
	function (req, res, next) {
		pagination.setLimit(200);

		stats.getTimeline(req, res).then(function (data) {
			res.render('stats/timeline', { 
				menu: 'timeline-month', 
				title: 'Timeline of top artists', 
				artists: data.results,
				topResult: data.topResult,
				pagination: data.pagination,
				periodLabel: 'Month'
			});
		}).catch(function (error) {
			next(createError(500, error));
		});
	}
);

router.get('/timeline-week', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('day')), 
	function (req, res, next) {
		pagination.setLimit(53);

		stats.getTimeline(req, res, '%Y-%W').then(function (data) {
			res.render('stats/timeline', { 
				menu: 'timeline-week', 
				title: 'Timeline of top artists', 
				artists: data.results,
				topResult: data.topResult,
				pagination: data.pagination,
				periodLabel: 'Week'
			});
		}).catch(function (error) {
			next(createError(500, error));
		});
	}
);


module.exports = router;
