(function ($) {
    let next = 2;
    let timeout = false;
    let no_ajax = false;

    $(document).ready(function () {
        //setTimeout(loadPage, 1000, next);
    });

    $(window).scroll(function () {
        if ($(window).scrollTop() + $(window).height() > $(document).height() - 100) {
            if (next && !timeout) {
                console.log('Trigger loadpage', timeout)
                timeout = true;
                loadPage(next);
            }
        }
    });

    function loadPage(page) {
        if (no_ajax) {
            return;
        }

        let $tbody = $(".table tbody");
        let $base_tr = $tbody.find("tr").first().clone();

        let url = new URL(window.location.href);
        let filter = url.search.substr(1);
        let pathname = url.pathname;

        filter.replace('limit=', 'xlimit=');
        filter.replace('page=', 'xpage=');

        $("[data-id='autoloader']").text('Loading next page..').show();

        fetch(`${pathname}?limit=20&page=${page}&${filter}`, {
            headers: {
                "X-Requested-With": "XMLHttpRequest"
            }
        }).then(response => response.json()).catch(function () {
            $("[data-id='autoloader']").text('').hide();
            no_ajax = true;
        }).then(function (json) {
            if (no_ajax || 'blocked' in json) {
                $("[data-id='autoloader']").text('').hide();
                no_ajax = true;
                return;
            }

            page = json.pagination.current;
            next = json.pagination.next;
            console.log('set next: ', next);
            let items, max_scrobbles;

            if ('artists' in json) {
                items = json.artists;
            } else if ('albums' in json) {
                items = json.albums;
            } else if ('tracks' in json) {
                items = json.tracks;
            }

            items.forEach(item => {
                $tr = $base_tr.clone();
                $tr.find('[data-search="artist"]').text(item.artist);
                $tr.find('[data-search="album"]').text(item.album);
                $tr.find('[data-search="track"]').text(item.track);

                if ('utc' in item) {
                    let date = moment(item.utc, 'X').format('L LT');
                    $tr.find('[data-property="utc"]').text(date);
                }

                if ('scrobbles' in item) {
                    if (!max_scrobbles) {
                        max_scrobbles = json.topResult.scrobbles;
                    }
                    let percentage = Math.round(item.scrobbles / max_scrobbles * 100);

                    $tr.find('.progress-td .progress .progress-bar')
                        .attr('aria-valuenow', percentage)
                        .attr('style', 'width:' + percentage + '%')
                        .text(item.scrobbles);
                }

                $tr.appendTo($tbody);
            });

            $(".table").trigger('page:loaded');

            $(".pagination").hide();
            timeout = false;
        });
    }

})(jQuery);