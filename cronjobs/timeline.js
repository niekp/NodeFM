const database = require('../db');
const helper = require('./helper');
const logger = require('../models/logger');

let CRONJOB_KEY = 'timeline';

function getLastRun(username) {
	return new Promise((resolve, reject) => {
		database.executeQuery(
			`SELECT utc FROM Cronjob WHERE key = '${CRONJOB_KEY}' AND status = 'SUCCESS' ORDER BY utc DESC LIMIT 0, 1`,
			username
		).then(function (data) {
			if (!data.length) {
				resolve(157770000000); // The minimum. The api is a bit buggy so it contains some 1970 timestamps.
			} else {
				resolve(data[0].utc);
			}
		}).catch(function (error) {
			reject(error);
		});
	});


}

function getMonthTotalFromPeriod(period, year_amount) {
	let year = parseInt(period.split('-')[0]);
	let month = parseInt(period.split('-')[1]);

	return (year * year_amount) + month
}

function getPeriod(username, format = '%Y-%m') {
	return new Promise((resolve, reject) => {
		getLastRun(username).then(function (last_run) {
			last_run = (new Date(last_run).getTime() / 1000) - (30 * 24 * 60 * 60);
			
			database.executeQuery(`
			SELECT MIN(STRFTIME('${format}', DATETIME(utc, 'unixepoch'))) AS start, 
			MAX(STRFTIME('${format}', DATETIME(utc, 'unixepoch'))) as end 
			FROM Scrobble
			WHERE utc > '${last_run}'`,
				username).then(function (data) {
					resolve(data);
				}).catch(function (error) {
					reject(error);
				});
		}).catch(function (error) {
			reject(error);
		});
	});
}

function getTopArtists(period, username, format) {
	return new Promise((resolve, reject) => {

		return database.executeQuery(
			`SELECT A.name, COUNT(*) AS count FROM Scrobble as S
			INNER JOIN Artist as A
			ON A.id = S.artist_id
			WHERE STRFTIME('${format}', DATETIME(S.utc, 'unixepoch')) = '${period}'
			GROUP BY A.name
			ORDER BY count DESC
			LIMIT 0, 50`,
			username
		).then(function (data) {
			if (data.length) {
				resolve(data);
			} else {
				resolve(null);
			}
		}).catch(function (error) {
			reject(error);
		})
	});
}

async function saveTopArtists(artists, period, username, format) {
	if (artists) {
		try {
			await database.executeQuery(`DELETE FROM ArtistTimeline WHERE format = '${format}' AND period = '${period}'`, username);
		} catch (ex) {
			logger.log(logger.ERROR, `Error deleting from ArtistTimeline`, ex);
			throw 'Error deleting from ArtistTimeline'
		}

		try {
			let rank = 1;
			for (artist of artists) {
				await database.executeQuery(`INSERT INTO ArtistTimeline (artist, period, scrobbles, format, rank) VALUES (?, ?, ?, ?, ?)`, username, [artist.name, period, artist.count, format, rank]);
				rank++;
			}
			return;
		} catch(ex) {
			logger.log(logger.ERROR, `Error inserting ArtistTimeline`, ex);
			throw 'Error inserting ArtistTimeline';
		}
	}
}


module.exports = {
	run: async function () {
		try {
			users = await helper.getUsers();
			for (let username of users) {
				await helper.connect(username);

				logger.log(logger.INFO, `Timeline - ${username} - run cronjob`);

				for (let format of [['%Y-%W', 53], ['%Y-%m', 12]]) {
					let period = await getPeriod(username, format[0]);

					let start, end, current;

					if (!period[0]['start'] || !period[0]['end']) {
						done = true;
					} else {
						start = period[0]['start'];
						end = period[0]['end'];
						current = start;
					}

					while (true) {
						// Setup this period
						let year = current.split('-')[0];
						let month = current.split('-')[1];

						try {
							let artists = await getTopArtists(current, username, format[0]);
							await saveTopArtists(artists, current, username, format[0])
						} catch (ex) {
							logger.log(logger.ERROR, `Error saving timeline period`, ex);
						}

						// Check if done
						if (getMonthTotalFromPeriod(current, format[1]) >= getMonthTotalFromPeriod(end, format[1])) {
							break;
						}

						// Setup next period
						month++;
						if (month > format[1]) {
							month = 1;
							year++;
						}

						current = year + '-' + month.toString().padStart(2, '0');
					}
				}

				database.executeQuery(
					`INSERT INTO Cronjob (key, status) VALUES ('${CRONJOB_KEY}', 'SUCCESS')`,
					username
				);
			}
		} catch (ex) {
			logger.log(logger.ERROR, `timeline`, ex);
		}
	},
}
