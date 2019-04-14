# Node.FM
Node.FM is a webapp based on a copy of your last.fm data (using [lastfm-sqlite-backup](https://github.com/niekp/lastfm-sqlite-backup)).

The application currently contains:
- Recent tracks
- Top artist, albums, tracks based on a date filter
- Top artist, album, track discoveries. (Top artist in a given period that have no scrobbles before then)
- Scrobbles per timeunit (hour, day, week, month, year)
- Blasts from the past. (Top artists from a previous period but have no scrobbles since)
- Timeline of top artists. (A list of the top artist per month)

[![Screenshot](https://user-images.githubusercontent.com/19265518/56091793-9694c580-5eb3-11e9-8ae9-ea61d644e801.png)](https://youtu.be/29EQut2zfqs)
_click the image for a video demo_

# How to run
- First of all you need a database.
    + Clone [lastfm-sqlite-backup](https://github.com/niekp/lastfm-sqlite-backup)
    + Set the API-keys and parameters
    + Manually run the first time
    + Setup a cronjob so it keeps the DB up to date
- Clone this repo
- Set the parameters in [/config/default.json](config/default.json)
    + Or use `config/production.json` / `config/development.json` and set up `export NODE_ENV=development`
- Install dependencies with `npm install`
- Run with `npm start`
    + Or run with a `systemd` file [example](bin/nodefm.service)
- Setup a remote proxy or port-forwarding to expose the application to the world.

Or send me a message and i'll add you to my own installation (: 
