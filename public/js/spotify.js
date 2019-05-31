(function ($) {

    $(document).ready(function() {
        // Prepend a play button in the table
        $('[data-type]').parents('table').find('thead tr').prepend("<th style='width: 16px;' />");
        $('[data-type]').prepend("<td data-play-button><i class='far fa-play-circle'></i></td>");

        $('[data-play-button]').on('click', play);

        $(".table").on('page:loaded', function () {
            console.log('page loaded');
            $('[data-play-button]').unbind('click');
            $('[data-play-button]').on('click', play);
        })

    });

    

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
            });

    }

}) (jQuery);
