var helper = require('./helper.js');

/**
 * Add a cronjobs table to keep track of the run status and errors
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);

    this.run = function () {
        return new Promise((resolve, reject) => {
            
            migration_helper.addTable('Releases',
                'CREATE TABLE Releases (id INTEGER PRIMARY KEY, artist string, album string, image string, type string, uri string, release_date date, match tinyint)'
            ).then(function () {
                resolve();
            }).catch(function(ex) {
                reject(ex);
            })

        });
    }
};


module.exports = Migration;
