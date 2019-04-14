/**
 * A script to run all cronjobs without waiting for the schedule
 * 
 * note: This is async so the jobs don't wait on each other.
 */

// 1. Migrations
require('../cronjobs/migration.js');

// 2. Timeline
require('./timeline.js').run();
