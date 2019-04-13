var helper = require('./helper.js');

/**
 * Add a ArtistTimeline table to keep caluclated data.
 * Filled with /cronjobs/timeline and visible through stats/timeline
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);

    this.run = function() {
        return new Promise((resolve, reject) => {

            migration_helper.addTable('ArtistTimeline', 
                'CREATE TABLE ArtistTimeline (id INTEGER PRIMARY KEY, artist text, period text, scrobbles int)').then(function() {
                resolve();
            }).catch(function (error) {
                reject(error);
            })

        });
    }
};


module.exports = Migration;
