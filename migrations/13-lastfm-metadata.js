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

            promises.push(migration_helper.addColumn('Album', 'lastfm_last_search', 'datetime'));
            promises.push(migration_helper.addColumn('Artist', 'lastfm_last_search', 'datetime'));
            promises.push(migration_helper.addColumn('Track', 'lastfm_last_search', 'datetime'));
            promises.push(migration_helper.addColumn('Artist', 'image', 'text'));
           
            Promise.all(promises).then(function () {
                resolve();
            }).catch(function (error) {
                reject(error);
            });
        });
    }
};


module.exports = Migration;
