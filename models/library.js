var database = require('../db.js')
var stats = require('./stats.js');

module.exports = {

    getAlbums: function (artist, album, req, res) {
        let where = `WHERE B.name != '' AND (A.name LIKE ? `;
        let params = [artist]

        // Misuse getAlbums for the search function. If the library gets implemented more split this up
        if (album) {
            where += ` OR B.name LIKE ? `
            params.push(album);
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

    search: function(query, req, res) {
        return this.getAlbums('%' + query + '%', '%' + query + '%', req, res);
    }
}
