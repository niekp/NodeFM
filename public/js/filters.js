(function($){

    $("[data-datefilter]").click(function() {
        let datefilter = $(this).data('datefilter');
        let enddate = moment().format('L');
        let startdate = '';

        if (datefilter !== 'empty') {
            setCookie('datefilter', datefilter, 180);
            let offset = datefilter.split(' ');
            let offsetAmount = parseInt(offset[0]);
            let offsetUnit = offset[1];

            startdate = moment().subtract(offsetAmount, offsetUnit).format('L');
        }
        
        $("input[name='filter[start-date]']").val(startdate);
        $("input[name='filter[end-date]']").val(enddate);

        $("input[name^='filter[']").first().closest('form').submit();
    });

    $("[data-toggle='album-only']").change(function() {
        let checked = $(this).is(':checked');
        setCookie('new-releases-album-only', (checked ? 1 : 0));
        window.location.reload(true);
    });

    function setCookie(cname, cvalue, exdays) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }

})(jQuery);
