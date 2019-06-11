var helper = require('./helper.js');
var db = require('../db.js');
/**
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);

    this.run = async function () {
        // Album fields
        await (migration_helper.addColumn('Album', 'spotify_uri', 'text'));
        await (migration_helper.addColumn('Album', 'spotify_id', 'text'));
        await (migration_helper.addColumn('Album', 'type', 'text'));
        await (migration_helper.addColumn('Album', 'release_date', 'date'));
        await (migration_helper.addColumn('Album', 'total_tracks', 'int'));
        await (migration_helper.addColumn('Album', 'image', 'text'));
        await (migration_helper.addColumn('Album', 'spotify_last_search', 'datetime'));
        
        // Artist fields
        await (migration_helper.addColumn('Artist', 'spotify_uri', 'text'));
        await (migration_helper.addColumn('Artist', 'spotify_id', 'text'));
        await (migration_helper.addColumn('Artist', 'spotify_last_search', 'datetime'));

        // Track fields
        await (migration_helper.addColumn('Track', 'spotify_uri', 'text'));
        await (migration_helper.addColumn('Track', 'spotify_id', 'text'));
        await (migration_helper.addColumn('Track', 'duration', 'int'));
        await (migration_helper.addColumn('Track', 'track_number', 'int'));
        await (migration_helper.addColumn('Track', 'spotify_last_search', 'datetime'));
    }
};


module.exports = Migration;
