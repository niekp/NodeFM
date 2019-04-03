var database = require('../db.js')

module.exports = {
    
    getRecentTracks: function(limit = 10, offset = 0) {
        return database.executeQuery(`SELECT artist, track FROM Scrobble ORDER BY UTS DESC LIMIT ${offset},${limit}`);
    },

    getTopArtists: function(limit = 10, offset = 0) {
        return database.executeQuery(`
        select artist, count(*) as scrobbles
        from Scrobble
        group by Artist
        order by Scrobbles desc
        limit ${offset},${limit}`);
    },
    
    getTopAlbums: function(limit = 10, offset = 0) {
        return database.executeQuery(`
        select artist, album, count(*) as scrobbles
        from Scrobble
        group by Artist, Album
        order by Scrobbles desc
        limit ${offset},${limit}`);
    }
}

