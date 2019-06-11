var helper = require('./helper.js');
/**
 * Add a cronjobs table to keep track of the run status and errors
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);


    this.run = function () {
        return new Promise((resolve, reject) => {
            let promises = [];
            promises.push(migration_helper.addColumn('Album', 'image_small', 'text'));
            promises.push(migration_helper.addColumn('Album', 'image_big', 'text'));

            Promise.all(promises).then(function() {
                resolve();
            }).catch(function(ex) {
                reject(ex);
            });
        });
    }
};


module.exports = Migration;
