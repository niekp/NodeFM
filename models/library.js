var database = require('../db.js')
var stats = require('./stats.js');

module.exports = {
    
    getAlbums: function(artist, res, req) {
        return stats.handleStatsRequest(
            req, res,
            'SELECT A.name as artist, B.name as album, count(*) as scrobbles',
            `FROM Scrobble as S
			INNER JOIN Artist as A on A.id = S.artist_id
            INNER JOIN Album as B on B.id = S.album_id
            WHERE A.name LIKE ? AND B.name != ''`,
            'GROUP by A.name, B.name',
            'ORDER by count(*) desc',
            `SELECT COUNT(*) AS count
            FROM Album as B
            INNER JOIN Artist as A on A.id = B.artist_id
            WHERE A.name LIKE ?`,
            false, null, [artist]
        );
    }
}
