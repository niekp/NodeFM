var helper = require('./helper.js');
var db = require('../db.js');
/**
 * Add a cronjobs table to keep track of the run status and errors
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);

    this.run = function() {
        return new Promise((resolve, reject) => {

            migration_helper.addColumn('ArtistTimeline', 'format', 'text').then(function() {
                resolve();

                db.executeQuery('DELETE FROM ArtistTimeline', user);
                db.executeQuery("DELETE FROM Cronjob WHERE key = 'timeline'", user);
            }).catch(function (error) {
                reject(error);
            });

        });
    }
};


module.exports = Migration;
