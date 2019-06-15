var helper = require('./helper.js');
var database = require('../db.js')
var logger = require('../models/logger.js');

module.exports = {
    run: async function () {
        try {
            users = await helper.getUsers();
            for (username of users) {
                await helper.connect(username);
                logger.log(logger.INFO, `Image helper - start job ${username}`);

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
                            logger.log(logger.ERROR, `Error saving album image helperfields`, ex);

                });

            database.executeQuery(`
UPDATE Artist SET 
    image = (
        SELECT url FROM Images AS I WHERE I.link_id = Artist.id AND type = 'artist' AND url != ''
            and (key like '320x%' or key like '640x%') order by key asc limit 0,1
    ),
    image_small = (
        SELECT url FROM Images AS I WHERE I.link_id = Artist.id AND type = 'artist' AND url != ''
            and (key like '64x%' or key like '160x%' or key like '200x%') order by key desc limit 0,1
    ),
    image_big = (
        SELECT url FROM Images AS I WHERE I.link_id = Artist.id AND type = 'artist'AND url != ''
        and (key like '1000x%' or key like '640x%') order by key asc limit 0,1
    )
    WHERE (image IS NULL or image_small IS NULL OR image_big IS NULL
            OR image = '' or image_small = '' OR image_big = '') AND id IN (
        SELECT link_id FROM Images where type = 'artist'
    );
    `, username).catch(function (ex) {
                    logger.log(logger.ERROR, `Error saving artist image helperfields`, ex);

                });


            }
        } catch (ex) {
            logger.log(logger.ERROR, `Error saving image helperfields`, ex);
        }
    },
}
