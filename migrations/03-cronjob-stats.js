var helper = require('./helper.js');

/**
 * Add a cronjobs table to keep track of the run status and errors
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);

    this.run = function() {
        return new Promise((resolve, reject) => {

            migration_helper.addTable('Cronjob', 
                'CREATE TABLE Cronjob (id INTEGER PRIMARY KEY, key string, utc datetime DEFAULT CURRENT_TIMESTAMP, status text, info text)').then(function() {
                resolve();
            }).catch(function (error) {
                reject(error);
            })

        });
    }
};


module.exports = Migration;
