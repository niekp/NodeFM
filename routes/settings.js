var express = require('express');
var router = express.Router();
var user = require('../models/user.js');
var security = require('../models/security.js');
var db = require('../db.js');

// Only allow logged in sessions
router.get('/', function (req, res, next) {
	if (!res.locals.loggedIn) {
		res.redirect('/settings/login');
	} else {
		p_isUnlocked = security.isUnlocked(req, res);
		p_hasPassword = security.hasPassword(req, res);

		Promise.all([p_isUnlocked, p_hasPassword]).then(function(values) {
			res.render('settings/settings', {
				unlocked: values[0],
				hasPassword: values[1]
			});
		}).catch(function () {
			res.render('settings/settings');
		})
	}
});

router.get('/login', function (req, res, next) {
	res.render('settings/login');
});

router.get('/login/:username', function(req, res,) {
	login(req, res, req.params.username);
});

router.post('/login', function (req, res, next) {
	login(req, res, req.body.username);
});

function login(req, res, username) {
	// Check the login
	username = user.sanitizeUsername(username);
	let validlogin = user.checkLogin(username) ;

	// Set the username cookie
	res.cookie('username', '');
	if (validlogin)
		res.cookie('username', username, { expires: new Date(Number(new Date()) + 315360000000), httpOnly: true });

	// Set local variables
	user.injectLocalVariables(req, res);
	
	if (validlogin) {
		res.redirect('/security/unlock');
	} else {
		// Render the login page
		res.render('settings/login', { 
			loggedIn: false,
			username: username, 
			success: validlogin
		});
	}
}

router.get('/download', function (req, res, next) {
	security.isUnlocked(req, res).then(function (unlocked) {
		if (unlocked) {
			var file = db.getDatabasePath(res.locals.username);
			res.download(file);
		} else {
			res.redirect('/settings');
		}
	}).catch(function() {
		res.redirect('/settings');
	})
	
});

module.exports = router;
