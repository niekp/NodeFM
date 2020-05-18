const express = require('express');
const router = express.Router();
const releaseModel = require('../models/releases')

// Only allow logged in sessions
router.get('/*', function (req, res, next) {
	if (!res.locals.loggedIn) {
		res.redirect('/settings/login');
	} else {
		next();
	}
});

router.get('/', function (req, res, next) {
	releaseModel.getReleases(req, res).then(function (releases) {
		res.render('releases/index', {
			menu: 'releases',
			title: 'New releases',
			releases: releases,
			album_only: releaseModel.getFilter(req)['album-only'] == true
		});
	});
});

module.exports = router;
