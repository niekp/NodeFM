var express = require('express');
var router = express.Router();
var security = require('../models/security.js');
var cache_helper = require('../models/cache_helper.js');
var logger = require('../models/logger.js');
var cache = cache_helper.getRedis();
cache.on('error', function (error) {});

// Only allow logged in sessions
router.get('/*', function (req, res, next) {
	if (!res.locals.loggedIn) {
		res.redirect('/settings/login');
	} else {
		next();
	}
});

router.get('/setpassword', function (req, res, next) {
	let p_isUnlocked = security.isUnlocked(req, res);
	let p_hasPassword = security.hasPassword(req, res);

	Promise.all([p_isUnlocked, p_hasPassword]).then(function (values) {
		let isUnlocked = values[0];
		let hasPassword = values[1];

		if (!hasPassword || isUnlocked) {
			res.render('security/set-password');
		} else {
			res.redirect('/settings');			
		}
	}).catch(function(ex) {
		res.redirect('/settings');
	});
});

router.post('/setpassword', function(req, res, next) {
	security.setPassword(req, res, req.body.password).then(function () {
		res.redirect('/settings');
	}).catch(function(ex) {
		logger.log(logger.ERROR, `Error setting password`, ex);
		
		res.render('security/set-password', {
			success: false
		});
	})
});

router.get('/unlock', function (req, res, next) {
	let p_isUnlocked = security.isUnlocked(req, res);
	let p_hasPassword = security.hasPassword(req, res);

	Promise.all([p_isUnlocked, p_hasPassword]).then(function (values) {
		let isUnlocked = values[0];
		let hasPassword = values[1];

		if (hasPassword && !isUnlocked) {
			res.render('security/login');
		} else {
			res.redirect('/');
		}
	}).catch(function (ex) {
		res.redirect('/settings');
	});
});

router.post('/unlock', function (req, res, next) {
	let p_isUnlocked = security.isUnlocked(req, res);
	let p_hasPassword = security.hasPassword(req, res);

	Promise.all([p_isUnlocked, p_hasPassword]).then(function (values) {
		let isUnlocked = values[0];
		let hasPassword = values[1];

		if (hasPassword && !isUnlocked) {
			cache.del('*' + res.locals.username + '*', function (error, added) { });

			security.checkPassword(req, res, req.body.password).then(function (valid) {
				if (!valid) {
					res.render('security/login', {success: false});
				} else {
					res.redirect('/settings');
				}
			}).catch(function (ex) {
				logger.log(logger.ERROR, `Error checking password`, ex);
				res.redirect('/settings');
			});
		} else {
			res.redirect('/settings');
		}
	}).catch(function (ex) {
		res.redirect('/settings');
	});
});

router.get('/reset', function (req, res, next) {
	cache.del('*' + res.locals.username + '*', function (error, added) { });

	security.reset(req, res).then(function () {
		res.redirect('/settings');
	}).catch(function (ex) {
		logger.log(logger.ERROR, `Error resetting password`, ex);
		res.redirect('/settings');
	})
});

module.exports = router;
