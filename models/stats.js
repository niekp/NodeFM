var database = require('../db.js')

module.exports = {
    
    getRecentTracks: function(limit = 10, offset = 0) {
        return database.executeQuery(`
        SELECT A.name as artist, T.name as track 
        FROM Scrobble as S 
        INNER JOIN Artist as A on A.id = S.artist_id
        INNER JOIN Track as T on T.id = S.track_id
        ORDER BY utc 
        DESC LIMIT ${offset},${limit}
        `);
    },

    getTopArtists: function(limit = 10, offset = 0) {
        return database.executeQuery(`
        SELECT a.name as artist, count(*) as scrobbles
        FROM Scrobble as S
        INNER JOIN Artist as A on A.id = S.artist_id
        GROUP by s.artist_id
        ORDER by count(*) desc
        LIMIT ${offset},${limit}`);
    },
    
    getTopAlbums: function(limit = 10, offset = 0) {
        return database.executeQuery(`
        SELECT A.name as artist, B.name as album, count(*) as scrobbles
        FROM Scrobble as S
        INNER JOIN Artist as A on A.id = S.artist_id
        INNER JOIN Album as B on B.id = S.album_id
        GROUP by S.artist_id, S.album_id
        ORDER by count(*) desc
        LIMIT ${offset},${limit}`);
    }
}

