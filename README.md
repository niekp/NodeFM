# node.fm
node.fm is a self-hosted version of last.fm. It copies all you last.fm data to a `sqlite3` database and keeps this up to date.

The application currently contains:
- Recent tracks
- Top artist, albums, tracks based on a date filter
- Top artist, album, track discoveries. (Top artist in a given period that have no scrobbles before then)
- Scrobbles per timeunit (hour, day, week, month, year)
- Blasts from the past. (Top artists from a previous period but have no scrobbles since)
- Timeline of top artists. (A list of the top artist per month)
- New releases (from the Spotify API, matched with your last.fm data)
- Playing artist, albums and tracks to spotify
- Spotify mini-player

[![Screenshot](https://user-images.githubusercontent.com/19265518/56091793-9694c580-5eb3-11e9-8ae9-ea61d644e801.png)](https://youtu.be/29EQut2zfqs)
_click the image for a video demo_

# How to run
- Clone this repo
- Set the parameters in [/config/default.json](config/default.json)
    + Or use `config/production.json` / `config/development.json` and set up `export NODE_ENV=development`
    + A spotify api-key is not mandatory
- Create an empty DB with the name of your lastfm username in the DB directory set in the config (like: `touch ./db/your-lastfm-username.db`)
- Install dependencies with `npm install`
- Run with `npm start`
    + Or run with a `systemd` file [example](bin/nodefm.service)
- Setup a remote proxy or port-forwarding to expose the application to the world.

