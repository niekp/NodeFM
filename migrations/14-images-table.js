var helper = require('./helper.js');
/**
 * Add a cronjobs table to keep track of the run status and errors
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);


    this.run = function () {
        return new Promise((resolve, reject) => {

            migration_helper.addTable('Images',
                'CREATE TABLE Images (id INTEGER PRIMARY KEY AUTOINCREMENT, type string, link_id int, source string, url string, key string)'
            ).then(function () {
                migration_helper.executeQuery('UPDATE Album SET spotify_last_search = NULL, lastfm_last_search = null').then(function() {
                    resolve();
                }).catch(function (ex) {
                    reject(ex);
                })
            }).catch(function (ex) {
                reject(ex);
            })
        });
    }
};


module.exports = Migration;
