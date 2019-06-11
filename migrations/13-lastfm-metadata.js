var helper = require('./helper.js');
var db = require('../db.js');
/**
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);

    this.run = async function () {
        await (migration_helper.addColumn('Album', 'lastfm_last_search', 'datetime'));
        await (migration_helper.addColumn('Artist', 'lastfm_last_search', 'datetime'));
        await (migration_helper.addColumn('Track', 'lastfm_last_search', 'datetime'));
        await (migration_helper.addColumn('Artist', 'image', 'text'));
    }
};


module.exports = Migration;
