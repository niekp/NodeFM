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

module.exports = {
    getPrefix: function() {
        return 'nodefm'
    },

    getExpires: function(duration) {
        let seconds;
        
        switch (duration) {
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
            default:
                seconds = 60 * 60;
                break;
        }

        return {expire: { 200: seconds, 500: 1, xxx: 30}}
    },

    getCacheName: function(req, res) {
        if (req && req.app.get('env') === 'development') {
            return 'dev:' + new Date().getTime();
        }

        return res.locals.username + '/' + req.url + '/' + JSON.stringify(req.params) + '/' + JSON.stringify(req.query);
    },

    setCacheName: function (req, res, next) {
        res.express_redis_cache_name = this.getCacheName(req, res)
        if (next) {
            next();
        }
	}

}

