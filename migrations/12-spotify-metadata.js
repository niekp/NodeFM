var helper = require('./helper.js');
var db = require('../db.js');
/**
 * Add a cronjobs table to keep track of the run status and errors
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);

    var promises = [];

    this.run = function () {
        return new Promise((resolve, reject) => {

            // Album fields
            promises.push(migration_helper.addColumn('Album', 'spotify_uri', 'text'));
            promises.push(migration_helper.addColumn('Album', 'spotify_id', 'text'));
            promises.push(migration_helper.addColumn('Album', 'type', 'text'));
            promises.push(migration_helper.addColumn('Album', 'release_date', 'date'));
            promises.push(migration_helper.addColumn('Album', 'total_tracks', 'int'));
            promises.push(migration_helper.addColumn('Album', 'image', 'text'));
            promises.push(migration_helper.addColumn('Album', 'spotify_last_search', 'datetime'));
            
            // Artist fields
            promises.push(migration_helper.addColumn('Artist', 'spotify_uri', 'text'));
            promises.push(migration_helper.addColumn('Artist', 'spotify_id', 'text'));
            promises.push(migration_helper.addColumn('Artist', 'spotify_last_search', 'datetime'));

            // Track fields
            promises.push(migration_helper.addColumn('Track', 'spotify_uri', 'text'));
            promises.push(migration_helper.addColumn('Track', 'spotify_id', 'text'));
            promises.push(migration_helper.addColumn('Track', 'milliseconds', 'int'));
            promises.push(migration_helper.addColumn('Track', 'track_number', 'int'));
            promises.push(migration_helper.addColumn('Track', 'spotify_last_search', 'datetime'));

           
            Promise.all(promises).then(function () {
                resolve();
            }).catch(function (error) {
                reject(error);
            });
        });
    }
};


module.exports = Migration;
