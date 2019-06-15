const helper = require('./helper');
const lastfm_helper = require('../models/lastfm_helper');
const logger = require('../models/logger');

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
