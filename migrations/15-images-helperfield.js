var helper = require('./helper.js');
/**
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);


    this.run = async function () {
        await migration_helper.addColumn('Album', 'image_small', 'text');
        await migration_helper.addColumn('Album', 'image_big', 'text');
    }
};


module.exports = Migration;
