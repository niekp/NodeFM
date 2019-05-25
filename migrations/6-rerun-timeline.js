var helper = require('./helper.js');
var db = require('../db.js');
/**
 * Add a cronjobs table to keep track of the run status and errors
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);

    this.run = function() {
        return migration_helper.executeQuery("DELETE FROM Cronjob WHERE key = 'timeline' AND STATUS = 'SUCCESS'");
    }
};


module.exports = Migration;
