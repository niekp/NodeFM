var helper = require('./helper.js');

/**
 * Add a cronjobs table to keep track of the run status and errors
 * @param {string} user 
 */
function Migration(user) {
    migration_helper = new helper(user);

    this.run = function () {
        return new Promise((resolve, reject) => {

            migration_helper.addTable('Spotify',
                'CREATE TABLE Spotify (id INTEGER PRIMARY KEY, code string, refresh_token string, token string, token_expires DATETIME, username string)'
            ).then(function () {
                migration_helper.executeQuery("DELETE FROM Spotify").then(function() {
                    migration_helper.executeQuery("INSERT INTO Spotify (code) values ('')").then(function() {
                        resolve();
                    }).catch(function(error) {
                        reject(error);
                    });
                }).catch(function (error) {
                    reject(error);
                });

            }).catch(function (error) {
                reject(error);
            });

        });
    }
};


module.exports = Migration;
