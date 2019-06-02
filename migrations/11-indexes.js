var helper = require('./helper.js');

/**
 * Add a cronjobs table to keep track of the run status and errors
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);

    this.run = function () {
        return new Promise((resolve, reject) => {
            let promises = [];
            promises.push(migration_helper.executeQuery(`CREATE INDEX Scrobble_id_IDX ON Scrobble (id)`));
            promises.push(migration_helper.executeQuery(`CREATE INDEX Scrobble_utc_IDX ON Scrobble (utc DESC)`));
            promises.push(migration_helper.executeQuery(`CREATE INDEX Scrobble_track_id_IDX ON Scrobble (track_id,artist_id,album_id)`));
            promises.push(migration_helper.executeQuery(`CREATE INDEX Artist_id_IDX ON Artist (id)`));
            promises.push(migration_helper.executeQuery(`CREATE INDEX Album_id_IDX ON Album (id)`));
            promises.push(migration_helper.executeQuery(`CREATE INDEX Track_id_IDX ON Track (id)`));
            promises.push(migration_helper.executeQuery(`CREATE INDEX Artist_name_IDX ON Artist(name)`));
            promises.push(migration_helper.executeQuery(`CREATE INDEX Album_name_IDX ON Album(name)`));
            
            Promise.all(promises).then(function () {
                resolve();
            }).then(function () {
                resolve();
            })
        });
    }
};


module.exports = Migration;
