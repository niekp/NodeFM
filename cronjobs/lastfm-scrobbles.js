var helper = require('./helper.js');
const lastfm_helper = require('../models/lastfm_helper.js');
var logger = require('../models/logger.js');

module.exports = {
	run: async function () {
		try {
			users = await helper.getUsers();
			for (username of users) {
				await helper.connect(username);
				lastfm_helper.syncLastFm(username);
			}
		} catch(ex) {
			logger.log(logger.ERROR, `lastfm-scrobbles`, ex);
		}
	},
}
