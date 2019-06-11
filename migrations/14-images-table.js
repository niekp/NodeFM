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
                    resolve();
                }).catch(function (error) {
                    reject(error);
                })
        });
    }
};


module.exports = Migration;
