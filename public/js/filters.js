(function($){
    /**
     * Datefilter
     */

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

    /**
     * Library
     */
    $("[data-toggle]").change(function () {
        let value;

        if ($(this).attr('type') === 'checkbox')
            value = $(this).is(':checked');
        if ($(this).attr('type') === 'number' || $(this).attr('type') === 'text')
            value = $(this).val();

        saveFilter($(this).data('toggle'), value)
        window.location.reload(true);
    });

    function saveFilter(key, value) {
        filter = getCookie('filter');
        if (!filter) {
            filter = {};
        } else {
            filter = JSON.parse(filter);
        }

        filter[key] = value;
        setCookie('filter', JSON.stringify(filter));
    }

    /**
     * Set a cookie for a number of days
     * @param {string} cname 
     * @param {string} cvalue 
     * @param {int} exdays 
     */
    function setCookie(cname, cvalue, exdays = 180) {
        var d = new Date();
        d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
        var expires = "expires=" + d.toUTCString();
        document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
    }

    function getCookie(cname) {
        var name = cname + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') {
                c = c.substring(1);
            }
            if (c.indexOf(name) == 0) {
                return c.substring(name.length, c.length);
            }
        }
        return "";
    }

})(jQuery);
