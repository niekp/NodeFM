var helper = require('./helper.js');
const lastfm_helper = require('../models/lastfm_helper.js');

module.exports = {
	run: async function () {
		try {
			users = await helper.getUsers();
			for (username of users) {
				await helper.connect(username);
				lastfm_helper.syncLastFm(username);
			}
		} catch(ex) {
			console.error('lastfm-scrobbles', ex);
		}
	},
}
