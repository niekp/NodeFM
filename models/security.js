var database = require('../db.js')
const crypto = require('crypto');
var logger = require('./logger.js');

/**
 * Hash a string
 * @param {string} data 
 * @returns {string} the hash
 */
function getHash(data) {
    const hash = crypto.createHash('sha256');
    hash.update(data);
    return hash.digest('hex');
}

function createSession(req, res) {
    return new Promise((resolve, reject) => {
        let hash = crypto.randomBytes(20).toString('hex');

        database.executeQuery(`INSERT INTO Session (hash, expires_on) VALUES (?, datetime('now', '180 day'))`, res.locals.username, [
            hash
        ]).then(function () {
            res.cookie('hash', hash, { expires: new Date(Number(new Date()) + 15552000000), httpOnly: true });
            resolve(true);
        }).catch(function (ex) {
            reject(ex);
        })
    });
}

module.exports = {

    /**
     * Check if the user has a password set
     * @param {Request} req 
     * @param {Response} res 
     * @returns {Promise<boolean>}
     */
    hasPassword: function(req, res) {
        return new Promise((resolve, reject) => {
            if (!res.locals.username) {
                resolve(false);
                return;
            }
            
            database.executeQuery('SELECT password FROM Security', res.locals.username).then(function (results) {
                if (results.length === 0) {
                    resolve(false);
                } else {
                    resolve(results[0].password.length > 0);
                }
            }).catch(function(ex) {
                logger.log(logger.ERROR, `Error selecting security record`, ex);
                resolve(false);
            })
        });
    },

    /**
     * Check if the current session has access to sensitive data
     * @param {Request} req 
     * @param {Response} res 
     * @returns {Promise<boolean>} | returns true if the DB is unlocked
     */
    isUnlocked: function(req, res) {
        return new Promise((resolve, reject) => {
            this.hasPassword(req, res).then(function(hasPassword) {
                if (!hasPassword || !req.cookies || !req.cookies['hash']) {
                    resolve(false);
                    return;
                }

                database.executeQuery(
                    `SELECT * FROM Session 
                    WHERE hash = ? AND expires_on > datetime('now')`, 
                    res.locals.username, [ req.cookies['hash']]).then(function(sessions) {
                        if (sessions.length > 0) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                }).catch(function(ex) {
                    logger.log(logger.ERROR, `Error checking session`, ex);
                    resolve(false);
                });
            }).catch(function(ex) {
                logger.log(logger.ERROR, `Error checking hasPasword`, ex);
                resolve(false);
            });
        });
    },

    /**
     * Set the password of the account
     * @param {Request} req 
     * @param {Response} res 
     * @param {string} password 
     * @returns {Promise<boolean>} success
     */
    setPassword: function(req, res, password) {
        return new Promise((resolve, reject) => {
            if (!password.length) {
                reject('No password was given');
                return;
            }

            let p_isUnlocked = this.isUnlocked(req, res);
            let p_hasPassword = this.hasPassword(req, res);
            let self = this;

            Promise.all([p_isUnlocked, p_hasPassword]).then(function (values) {
                let isUnlocked = values[0];
                let hasPassword = values[1];
                
                if (!hasPassword || isUnlocked) {
                    database.executeQuery('DELETE FROM Security', res.locals.username).then(function() {
                        database.executeQuery('INSERT INTO Security (password) VALUES (?)', res.locals.username, [
                            getHash(password)
                        ]).then(function() {
                            self.checkPassword(req, res, password).then(function (valid) {
                                if (valid) {
                                    resolve(true);
                                } else {
                                    reject('Something went wrong');
                                }
                            }).catch(function (ex) {
                                reject(ex);
                            })
                        }).catch(function (ex) {
                            reject(ex);
                        });
                    }).catch(function (ex) {
                        reject(ex);
                    });
                } else {
                    reject('Not allowed');
                }
            }).catch(function (ex) {
                logger.log(logger.ERROR, `Error getting hasPassword and isUnlocked status`, ex);
                reject('Not allowed');
            });
        });
    },

    /**
     * Check if the given password is correct
     * @param {Request} req 
     * @param {Response} res 
     * @param {string} password 
     * @returns {Promise<boolean>} correct
     */
    checkPassword: function(req, res, password) {
        return new Promise((resolve, reject) => {
            database.executeQuery('SELECT password FROM Security', res.locals.username).then(function (results) {
                if (results.length === 0) {
                    resolve(false);
                } else {
                    if (results[0].password === getHash(password)) {
                        createSession(req, res).then(function () {
                            resolve(true);
                        }).catch(function(ex) {
                            reject(ex);
                        })
                    } else {
                        resolve(false);
                    }
                }
            }).catch(function (ex) {
                logger.log(logger.ERROR, `Error checkPassword`, ex);
                resolve(false);
            })
        });
    },

    /**
     * Wipe the tables the password protects (spotify)
     * @param {Request} req 
     * @param {Response} res 
     */
    reset: function(req, res) {
        let promises = [];
        promises.push(database.executeQuery('DELETE FROM Security', res.locals.username));
        promises.push(database.executeQuery('DELETE FROM Session', res.locals.username));
        promises.push(database.executeQuery('DELETE FROM Spotify', res.locals.username));
        return new Promise((resolve, reject) => {
            Promise.all(promises).then(function() {
                resolve();
            }).catch(function(ex) {
                reject(ex);
            });
        });
    }

    
}
