var helper = require('./helper.js');

// As far as i know interfaces aren't a thing in JS. So for future migrations.

/*
function ClassName(user) {
    this.run = function();
}

module.exports = ClassName
*/

/**
 * Add the migration table so future migrations can be automaticly run.
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);

    this.run = function() {
        let promises = [];
        return new Promise((resolve, reject) => {

            promises.push(migration_helper.addTable('Artist',
                'CREATE TABLE Artist (id INTEGER PRIMARY KEY AUTOINCREMENT, name text)'));

            promises.push(migration_helper.addTable('Album',
                'CREATE TABLE Album (id INTEGER PRIMARY KEY AUTOINCREMENT, artist_id INTEGER, name text)'));

            promises.push(migration_helper.addTable('Track',
                'CREATE TABLE Track (id INTEGER PRIMARY KEY AUTOINCREMENT, artist_id INTEGER, album_id INTEGER, name text)'));

            promises.push(migration_helper.addTable('Scrobble',
                'CREATE TABLE Scrobble (id INTEGER PRIMARY KEY AUTOINCREMENT, utc datetime, track_id INTEGER, artist_id INTEGER, album_id INTEGER)'));

            promises.push(migration_helper.addTable('Status',
                'CREATE TABLE Status (lastsync datetime, page int)'));
               
            Promise.all(promises).then(function () {
                resolve();
            }).catch(function (ex) {
                reject(ex);
            })
        });
    }
};


module.exports = Migration;
