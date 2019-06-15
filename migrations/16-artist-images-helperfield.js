var helper = require('./helper.js');
/**
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);


    this.run = async function () {
        await migration_helper.addColumn('Artist', 'image', 'text');
        await migration_helper.addColumn('Artist', 'image_small', 'text');
        await migration_helper.addColumn('Artist', 'image_big', 'text');
    }
};


module.exports = Migration;
