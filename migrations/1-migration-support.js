var helper = require('./helper.js');

function Migration(user) {
    migration_helper = new helper(user);

    this.run = function() {
        return new Promise((resolve, reject) => {

            migration_helper.addTable('Migration', 
                'CREATE TABLE Migration (id INTEGER PRIMARY KEY, name text, status text, utc datetime)').then(function() {
                resolve();
            }).catch(function (error) {
                reject(error);
            })

        });
    }
};


module.exports = Migration;
