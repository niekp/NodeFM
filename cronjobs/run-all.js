/**
 * A script to run all cronjobs without waiting for the schedule
 * 
 * note: This is async so the jobs don't wait on each other.
 */

// 1. Migrations
//require('../cronjobs/migration.js');
process.on('unhandledRejection', (reason, p) => {
    console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
});

// 2. Timeline
require('./timeline.js').run();

// 3. Musicbrainz
//require('./musicbrainz.js').run();
