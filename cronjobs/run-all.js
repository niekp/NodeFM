const logger = require('../models/logger');

/**
 * A script to run all cronjobs without waiting for the schedule
 * 
 * note: This is async so the jobs don't wait on each other.
 */

// 1. Migrations
//require('../cronjobs/migration.js');
process.on('unhandledRejection', (reason, p) => {
    logger.log(logger.ERROR, `Unhandled Rejection at: Promise\t${p}\treason:\t${reason}`);
});

// 2. Timeline
require('./itunes-releases').run();
//require('./spotify-metadata').run();
//require('./images-helperfields').run();

// 3. Musicbrainz
//require('./musicbrainz.js').run();
