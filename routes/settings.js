var express = require('express');
var router = express.Router();
var user = require('../models/user.js');

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
		res.redirect('/stats');
		
	} else {
		// Render the login page
		res.render('settings/login', { 
			loggedIn: false,
			username: username, 
			success: validlogin
		});
	}
	
});

module.exports = router;
