const logger = require('./logger');

/*
Usage:
var cache_helper = require('../models/cache_helper.js')
var cache = require('express-redis-cache')({ prefix: cache_helper.getPrefix() });

router.get('/route', 
	function (req, res, next) {cache_helper.setCacheName(req, res, next);}, 
	cache.route(cache_helper.getExpires('day')), 
	function (req, res, next) {
		// The real request handling
	}
);
*/

let redis;

module.exports = {
    getPrefix: function() {
        return 'nodefm'
    },

    getExpiresSeconds: function(duration) {
        let seconds;

        switch (duration) {
            case '1min':
                seconds = 60;
            case '5min':
                seconds = 60 * 5;
            case 'half-hour':
                seconds = 60 * 30;
                break;
            case 'hour':
                seconds = 60 * 60;
                break;
            case 'day':
                seconds = 60 * 60 * 24;
                break;
            case 'week':
                seconds = 60 * 60 * 24 * 7;
                break;
            case 'month':
                seconds = 60 * 60 * 24 * 30;
                break;
            default:
                seconds = 60 * 60;
                break;
        }

        return seconds;
    },

    getExpires: function (duration) {
        let seconds = this.getExpiresSeconds(duration);
        return {expire: { 200: seconds, 500: 1, xxx: 30}}
    },
    
    /**
     * Get the automatic cache-key name based on request information
     * @param {Request} req 
     * @param {Response} res 
     * @returns {string} cache-key
     */
    getCacheName: function(req, res) {
        return res.locals.username + '/' + req.url + '/' + (req.xhr ? 'ajax/' : '') + JSON.stringify(req.params) + '/' + JSON.stringify(req.query) + JSON.stringify(req.cookies['filter']);
    },

    /**
     * Automaticly set the name of the cache key to the request information (url, params etc.)
     * @param {Request} req 
     * @param {Response} res 
     * @param {next} next 
     */
    setCacheName: function (req, res, next) {
        res.express_redis_cache_name = this.getCacheName(req, res);
        
        if (req && req.app.get('env') === 'development') {
            res.use_express_redis_cache = false;
        }

        if (next) {
            next();
        }
    },

    getRedis: function() {
        if (!redis) {
            redis = require('express-redis-cache')({ prefix: this.getPrefix() });
        }
        return redis;
    },
    
    /**
     * Store a value in cache
     * @param {string} key 
     * @param {string|object} value 
     * @param {int} expire number of seconds
     * @param {string} type - see Redis Express docs for allowed types
     */
    save: function (key, value, expire = (60 * 60 * 24), type = 'String') {
        logger.log(logger.INFO, `Saving to cache: ${key}`);

        let cache = this.getRedis();
        cache.on('error', function (error) { });

        cache.get(key, function (error, entries) {
            if (type == 'json') {
                value = JSON.stringify(value);
            }

            cache.add(key, value, { expire: expire, type: type }, function (error, added) { });
        });
    },

    /**
     * Get the content of a cache key
     * @param {string} key 
     * @returns {Promise<string|object|PromiseRejectionEvent>} The result. Reject when the key is not found.
     */
    get: function(key) {
        logger.log(logger.INFO, `Getting from cache: ${key}`);

        return new Promise((resolve, reject) => {
            let cache = this.getRedis();
            cache.on('error', function (error) {
                reject();
            });

            cache.get(key, function (error, entries) {
                if (error) {
                    reject();
                }
                if (entries && entries.length && entries[0].body) {
                    if (entries[0].type === 'json') {
                        resolve(JSON.parse(entries[0].body));
                    } else {
                        resolve(entries[0].body);
                    }
                } else {
                    logger.log(logger.INFO, `Cache key not found: ${key}`);
                    reject('Not found');
                }
            });
        });
    }
}

