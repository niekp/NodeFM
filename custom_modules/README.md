# What is this?
Not really the way it's supposed to be done. But ohwell.. i couldn't get module overrides to work.

The musicbrainz API sometimes reacts with a 301 if you put in a old hash (which last.fm has a lot of.)
The nodebrainz module i loaded didn't react very good to that. So i've put in a bit of hacky code so it retries on the new URL.
