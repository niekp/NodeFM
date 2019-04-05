var express = require('express');
var router = express.Router();
var user = require('../models/user.js');
var db = require('../db.js');

// Only allow logged in sessions
router.get('/', function (req, res, next) {
	if (!res.locals.loggedIn) {
		res.redirect('/settings/login');
	} else {
		res.render('settings/settings');
	}
});

router.get('/login', function (req, res, next) {
	res.render('settings/login');
});

router.post('/login', function (req, res, next) {
	// Check the login
	let username = user.sanitizeUsername(req.body.username);
	let validlogin = user.checkLogin(username) ;

	// Set the username cookie
	res.cookie('username', '');
	if (validlogin)
		res.cookie('username', username);

	// Set local variables
	user.injectLocalVariables(req, res);
	
	if (validlogin) {
		res.redirect('/');
		
	} else {
		// Render the login page
		res.render('settings/login', { 
			loggedIn: false,
			username: username, 
			success: validlogin
		});
	}
});

router.get('/download', function (req, res, next) {
	var file = db.getDatabasePath(res.locals.username);
  	res.download(file);
});

module.exports = router;
