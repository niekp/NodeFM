(function ($) {
    pendingTimeouts = [];
    let play_button_added = false;
    $(document).ready(function() {
        // Prepend a play button in the table
        addPlayButtons();
        $(".table").on('page:loaded', function () {
            addPlayButtons();
        });

        $('body').on('modal:loaded', function() {
            addPlayButtons();
        })

        $(".spotify-player [data-toggle='next']").on('click', next);
        $(".spotify-player [data-toggle='prev']").on('click', prev);

        nowPlaying();
    });

    function addPlayButtons() {
        $(".table").each(function () {
            if (!$(this).data('play-button-added')) {
                $(this).find('[data-type]:not([data-play-button-added])').parents('table').find('thead tr').prepend("<th style='width: 16px;' />");
                $(this).find('[data-type]:not([data-play-button-added])').prepend("<td data-play-button><i class='play-button fas fa-play'></i></td>");
                $(this).data('play-button-added', true);
            }
        });

        $('[data-play-button]').unbind('click');
        $('[data-play-button]').on('click', play);
    }

    function play() {
        let tr = $(this).closest('[data-type]');

        let type = tr.data('type');
        let artist, album, track;
        artist = album = track = '';

        // Extract all search variables
        tr.find('td[data-search]').each(function () {
            let search = $(this).data('search');
            let value = $(this).text();
            switch (search) {
                case 'artist':
                    artist = value;
                    break;
                case 'album':
                    album = value;
                    break;
                case 'track':
                    track = value;
                    break;
            }
        });

        // Execute the play command
        fetch('/spotify/control/play?type='
            + encodeURI(type)
            + '&artist=' + encodeURI(artist)
            + '&album=' + encodeURI(album)
            + '&track=' + encodeURI(track)).then(res => res.json()).then(function (data) {
                if (!data.success && data.error) {
                    console.error(data.error)
                    alert("Something went wrong.");
                }
            }).then(function () {
                console.log('force update die ding');
                pendingTimeouts.push(setTimeout(nowPlaying, 500, true));
            })
    }

    function next() {
        fetch('/spotify/control/next').then(function () {
            pendingTimeouts.push(setTimeout(nowPlaying, 500, true));
        });
    }

    function prev() {
        fetch('/spotify/control/prev').then(function () {
            pendingTimeouts.push(setTimeout(nowPlaying, 500, true));
        });
    }

    let force_mod = 1;

    function nowPlaying(force) {
        let url = '/spotify/control/nowplaying';
        if (force)
            url += '?force=1';
            

        fetch(url).then(res => res.json()).then(function(now_playing) {
            $(".play-button").show();
            $(".spotify-player").show();
            
            now_playing = JSON.parse(now_playing);

            let $player = $(".spotify-player");
            $player.find(".album-art").html("<img src='" + now_playing.image + "' />");
            $player.find(".artist").text(now_playing.artist);
            $player.find(".track").text(now_playing.track);
            $player.find(".album").text(now_playing.album);

            let ends_in = ((now_playing.timestamp + (now_playing.duration - now_playing.progress) - new Date().getTime()));

            clearTimeouts();

            if (ends_in < 0) {
                pendingTimeouts.push(setTimeout(nowPlaying, 1000, true));
            } else if (ends_in < 5000) {
                pendingTimeouts.push(setTimeout(nowPlaying, ends_in, true));
            } else {
                pendingTimeouts.push(setTimeout(nowPlaying, 5000, (force_mod % 3 === 0)));
            }

            force_mod++;
        }).catch(function() {
            $(".play-button").hide();
            $(".spotify-player").hide();
            pendingTimeouts.push(setTimeout(nowPlaying, 5000, true));
        })
    }

    function clearTimeouts() {
        pendingTimeouts.forEach(timeout => {
            clearTimeout(timeout);
        });
        pendingTimeouts = [];
    }

}) (jQuery);
