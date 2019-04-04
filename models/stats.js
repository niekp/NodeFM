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
    },

    getTopArtistDiscoveries: function(limit = 10, offset = 0) {
        return database.executeQuery(`
        SELECT A.name as artist, count(*) as scrobbles
        FROM Scrobble as S
        INNER JOIN Artist as A on A.id = S.artist_id
        WHERE utc >= strftime('%s', datetime('now', '-180 day'))
        AND s.artist_id not in (
            select distinct(artist_id) from Scrobble where utc < strftime('%s', datetime('now', '-180 day'))
        )
        GROUP by s.artist_id
        ORDER by count(*) desc
        LIMIT ${offset},${limit}`);
    },

    getTopAlbumDiscoveries: function(limit = 10, offset = 0) {
        return database.executeQuery(`
        SELECT A.name as artist, B.name as album, count(*) as scrobbles
        FROM Scrobble as S
        INNER JOIN Artist as A on A.id = S.artist_id
        INNER JOIN Album as B on B.id = S.album_id
        WHERE utc >= strftime('%s', datetime('now', '-180 day'))
        and (s.artist_id || '-' || s.album_id) not in (
            select distinct(artist_id || '-' || album_id) as record from Scrobble where utc < strftime('%s', datetime('now', '-180 days'))
        )
        GROUP by s.artist_id, s.album_id
        ORDER by count(*) desc
        LIMIT ${offset},${limit}`);
    },

}

