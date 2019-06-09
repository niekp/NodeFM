var helper = require('./helper.js');
var db = require('../db.js');
/**
 * Add a cronjobs table to keep track of the run status and errors
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);

    var promises = [];

    this.run = function() {
        return new Promise((resolve, reject) => {

            // Album fields
            promises.push(migration_helper.addColumn('Album', 'musicbrainz_last_search', 'datetime'));
            promises.push(migration_helper.addColumn('Album', 'mbid', 'text'));
            promises.push(migration_helper.addColumn('Album', 'release_date', 'date'));

            // Track fields
            promises.push(migration_helper.addColumn('Track', 'musicbrainz_last_search', 'datetime'));
            promises.push(migration_helper.addColumn('Track', 'mbid', 'text'));
            promises.push(migration_helper.addColumn('Track', 'milliseconds', 'int'));
            promises.push(migration_helper.addColumn('Track', 'track_number', 'int'));
            
            // Artist fields
            promises.push(migration_helper.addColumn('Artist', 'musicbrainz_last_search', 'datetime'));
            promises.push(migration_helper.addColumn('Artist', 'mbid', 'text'));

            Promise.all(promises).then(function () {
                resolve();
            }).catch(function(error) {
                reject(error);
            });
        });
    }
};


module.exports = Migration;
