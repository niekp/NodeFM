const express = require('express');
const router = express.Router();

router.get('/', function (req, res, next) {
	if (res.locals.loggedIn) {
		res.redirect('/stats');
	} else {
		res.redirect('/settings/login');
	}
});

module.exports = router;
