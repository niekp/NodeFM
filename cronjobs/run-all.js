/**
 * A script to run all cronjobs without waiting for the schedule
 */

// 1. Migrations
require('../cronjobs/migration.js');

// 2. Timeline
require('./timeline.js').run();
