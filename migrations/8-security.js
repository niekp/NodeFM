var helper = require('./helper.js');

/**
 * Add a cronjobs table to keep track of the run status and errors
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);

    this.run = function () {
        return new Promise((resolve, reject) => {
            promises = [];
            promises.push(migration_helper.addTable('Security',
                'CREATE TABLE Security (id INTEGER PRIMARY KEY, password string)'
            ));
            promises.push(migration_helper.addTable('Session',
                'CREATE TABLE Session (id INTEGER PRIMARY KEY, hash string, expires_on datetime)'
            ));

            Promise.all(promises).then(function(values) {
                resolve();
            }).catch(function(ex) {
                console.error(ex)
                reject(ex);
            })
        });
    }
};


module.exports = Migration;
