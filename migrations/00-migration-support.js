var helper = require('./helper.js');

// As far as i know interfaces aren't a thing in JS. So for future migrations.

/*
function ClassName(user) {
	this.run = async function();
}

module.exports = ClassName
*/

/**
 * Add the migration table so future migrations can be automaticly run.
 * @param {string} user 
 */
function Migration(user) {
	migration_helper = new helper(user);

	this.run = async function() {
		await migration_helper.addTable('Migration', 
			'CREATE TABLE Migration (id INTEGER PRIMARY KEY, name text, status text, utc datetime)');
	}
};


module.exports = Migration;
