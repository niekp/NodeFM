var helper = require('./helper.js');
var database = require('../db.js')
var logger = require('../models/logger.js');

module.exports = {
    run: async function () {
        try {
            users = await helper.getUsers();
            for (username of users) {
                await helper.connect(username);
                database.executeQuery(`
UPDATE Album SET 
    image = (
        SELECT url FROM Images AS I WHERE I.link_id = Album.id AND type = 'album'
            AND (
                (source = 'lastfm' AND key = 'extralarge')
                or (source = 'spotify' AND key = '300x300')
            )
            AND url != ''
    ),
    image_small = (
        SELECT url FROM Images AS I WHERE I.link_id = Album.id AND type = 'album'
            AND (
                (source = 'lastfm' AND key = 'medium')
                or (source = 'spotify' AND key = '64x64')
            )
            AND url != ''
    ),
    image_big = (
        SELECT url FROM Images AS I WHERE I.link_id = Album.id AND type = 'album'
            AND (
                (source = 'lastfm' AND key = 'extralarge')
                or (source = 'spotify' AND key = '640x640')
            )
            AND url != ''
    )
    WHERE (image IS NULL or image_small IS NULL OR image_big IS NULL
            OR image = '' or image_small = '' OR image_big = '') AND id IN (
        SELECT link_id FROM Images where type = 'album'
    );
						`, username).catch(function (ex) {
                            logger.log(logger.ERROR, `Error saving image helperfields`, ex);

                });
            }
        } catch (ex) {
            logger.log(logger.ERROR, `Error saving image helperfields`, ex);
        }
    },
}
