var express = require('express');
var router = express.Router();
var library = require('../models/library.js')
var logger = require('../models/logger.js');
var createError = require('http-errors');

// Only allow logged in sessions
router.get('/*', function (req, res, next) {
	if (!res.locals.loggedIn) {
		res.redirect('/settings/login');
	} else {
		next();
	}
});

/**
 * Search route
 */
router.get('/', function (req, res, next) {
	library.search(req.query['q'], req, res).then(function (data) {
		data = {
			menu: 'search',
			q: req.query.q,
			albums: data.results,
			pagination: data.pagination,
			topResult: data.topResult,
			datefilter: false,
			modal: (req.query.modal == '1' ? true : false)
		}

		if (req.xhr) {
			res.json(data);
		} else {
			res.render('search/results', data);
		}
	}).catch(function (ex) {
		logger.log(logger.ERROR, `Error searching for ${req.param['q']}`, ex);
		next(createError(500, ex));
	})
	
});


module.exports = router;
