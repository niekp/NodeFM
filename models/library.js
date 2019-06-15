const { queryBuilder } = require("./queryBuilder");

const stats = require('./stats');
const database = require('../db');

/**
 * Does the current user have a spotify account
 * @param {Response} res 
 */
function hasSpotify(res) {
    return (res.locals.spotify_username && res.locals.spotify_username.length);
}

module.exports = {

    /**
     * Get the filter
     */
    getFilter: function(req) {
        return (req.cookies['filter'] ? JSON.parse(req.cookies['filter']) : {});
    },

    /**
     * Get a filtered list of artists
     * @param {Request} req 
     * @param {Response} res 
     */
    getArtists: function (req, res) {
        let query_builder = new queryBuilder();
        let filters = this.getFilter(req);

        if (filters['spotify-only'] && hasSpotify(res)) {
            query_builder.addWhere('A.spotify_uri IS NOT NULL');
        }
        if (filters['minimum-scrobbles'] && !isNaN(filters['minimum-scrobbles'])) {
            let amount = parseInt(filters['minimum-scrobbles']);
            query_builder.addHaving(`scrobbles >= ${amount}`);
        } else {
            query_builder.addHaving(`scrobbles >= 50`);
        }

        if (filters['random-order']) {
            query_builder.addOrder('RANDOM()');
        }

        query_builder.addOrder('a.name')

        return stats.handleStatsRequest(
            req, res,
            'SELECT a.name as artist, count(*) as scrobbles',
            `FROM Scrobble as S
            INNER JOIN Artist as A on A.id = S.artist_id
            ${query_builder.getWhere()}`,
            `GROUP by A.name 
            ${query_builder.getHaving()}`,
            query_builder.getOrder(),
            'SELECT COUNT(DISTINCT(artist_id)) AS count FROM scrobble',
            null, 'ORDER by count(*) desc'
        );
    },

    /**
     * Get a filtered list of albums
     * @param {Request} req 
     * @param {Response} res 
     */
    getAlbums: function (req, res) {
        let query_builder = new queryBuilder();
        let filters = this.getFilter(req);

        if (filters['spotify-only'] && hasSpotify(res)) {
            query_builder.addWhere('B.spotify_uri IS NOT NULL');
        }
        if (filters['minimum-scrobbles'] && !isNaN(filters['minimum-scrobbles'])) {
            let amount = parseInt(filters['minimum-scrobbles']);
            query_builder.addHaving(`scrobbles >= ${amount}`);
        } else {
            query_builder.addHaving(`scrobbles >= 50`);
        }

        if (filters['random-order']) {
            query_builder.addOrder('RANDOM()');
        }
        
        query_builder.addWhere("B.name != ''");
        query_builder.addOrder('B.name')

        return stats.handleStatsRequest(
            req, res,
            'SELECT A.name as artist, B.name as album, count(*) as scrobbles',
            `FROM Scrobble as S
			INNER JOIN Artist as A on A.id = S.artist_id
            INNER JOIN Album as B on B.id = S.album_id
            ${query_builder.getWhere()}`,
            `GROUP by A.name, B.name
            ${query_builder.getHaving()}`,
            query_builder.getOrder(),
            'SELECT COUNT(DISTINCT(album_id)) AS count FROM scrobble',
            null, 'ORDER by count(*) desc'
        );
    },

    /**
     * Get all albums of a artist (by name)
     * @param {string} artist 
     * @param {string} album 
     * @param {Request} req 
     * @param {Response} res 
     */
    getArtistAlbums: function (artist, album, req, res) {
        return this.search(artist, sources = ['artists'], req, res)
    },

    /**
     * Search for albums by artist name of album name
     * @param {string} query 
     * @param {array} sources 
     * @param {Request} req 
     * @param {Response} res 
     */
    search: function(query, sources = ['artists', 'albums'], req, res) {
        if (!sources) {
            sources = ['artists', 'albums'];
        }
        let where = `WHERE B.name != '' AND (`;
        let params = []

        if (sources.indexOf('artists') >= 0) {
            where += ` A.name LIKE ? `
            params.push(query);
        }
        if (sources.indexOf('albums') >= 0) {
            if (params.length) {
                where += ' OR';
            }
            where += ` B.name LIKE ? `
            params.push(query);
        }
        where += ')'

        let count_query = `SELECT COUNT(*) AS count
            FROM Album as B
            INNER JOIN Artist as A on A.id = B.artist_id
            ${where}`;

        if (req.query && req.query.modal == '1') {
            // Modals don't have pagination for now, so don't execute a count query to save time
            // And since we pass a variable it needs to be added to the count, so fake it till you make it.
            count_query = `SELECT 0 as count where 1 = 1 or 'x' = ?`;
        }
        return stats.handleStatsRequest(
            req, res,
            'SELECT A.name as artist, B.name as album, count(*) as scrobbles',
            `FROM Album as B
			INNER JOIN Scrobble as S on B.id = S.album_id
            INNER JOIN Artist as A on A.id = B.artist_id
            ${where}`,
            'GROUP by B.name, A.name',
            'ORDER by count(*) desc',
            count_query,
            false, null, params
        );
    },

    /**
     * Get the amount of scrobbles per month of an artist
     * @param {string} artist 
     * @param {Request} req 
     * @param {Response} res 
     */
    getArtistChart: async function(artist, req, res) {
        data = await database.executeQuery(`
            SELECT STRFTIME('%Y-%m', DATETIME(S.utc, 'unixepoch')) AS label, COUNT(*) AS value FROM Scrobble as S
            INNER JOIN Artist as A
            ON A.id = S.artist_id
            WHERE A.name LIKE ?
            GROUP BY STRFTIME('%Y-%m', DATETIME(S.utc, 'unixepoch'))
            ORDER BY STRFTIME('%Y-%m', DATETIME(S.utc, 'unixepoch'));
        `, res.locals.username, [artist]);

        if (!data.length) {
            return data;
        }

        // The data only has the months with scrobbles. Fill out the array with empty months
        let start = data[0].label;
        let end = data[data.length-1].label;
        let year_start = parseInt(start.split('-')[0]);
        let year_end = parseInt(end.split('-')[0]);

        // Flatten the data for easier checking
        let new_data = [];
        data.forEach(function (row) {
            new_data[row.label] = row.value;
        });
        data = new_data;

        for (year = year_start; year <= year_end; year++) {
            let month_start = 1;
            let month_end = 12;
            if (year == year_start)
                month_start = parseInt(start.split('-')[1]);
            if (year == year_end)
                month_end = parseInt(end.split('-')[1]);

            for (month = month_start; month <= month_end; month++) {
                let period = year + '-' + month.toString().padStart(2, '0');
                if (!data[period]) {
                    data[period] = 0;
                }
            }
        }

        // Unflatten the data back.. bit of duplicate code but watcha gonna do
        new_data = [];

        for (year = year_start; year <= year_end; year++) {
            let month_start = 1;
            let month_end = 12;
            if (year == year_start)
                month_start = parseInt(start.split('-')[1]);
            if (year == year_end)
                month_end = parseInt(end.split('-')[1]);

            for (month = month_start; month <= month_end; month++) {
                let period = year + '-' + month.toString().padStart(2, '0');
                new_data.push({label: period, value: data[period]});
            }
        }

        data = new_data;

        return data;
    },

}
