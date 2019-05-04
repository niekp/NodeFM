var express = require('express');
var router = express.Router();
var user = require('../models/user.js');
var db = require('../db.js');
var moment = require('moment');

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
		res.redirect('/');
		
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
	var file = db.getDatabasePath(res.locals.username);
  	res.download(file);
});

module.exports = router;
