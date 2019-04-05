var express = require('express');
var router = express.Router();

router.get('/', function (req, res, next) {
	if (res.locals.loggedIn) {
		res.redirect('/stats');
	} else {
		res.redirect('/settings/login');
	}
});

module.exports = router;
