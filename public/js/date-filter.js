(function($){

    $("[data-datefilter]").click(function() {
        let datefilter = $(this).data('datefilter');
        let enddate = moment().format('L');
        let startdate = '';

        if (datefilter !== 'empty') {
            let offset = datefilter.split(' ');
            let offsetAmount = parseInt(offset[0]);
            let offsetUnit = offset[1];

            startdate = moment().subtract(offsetAmount, offsetUnit).format('L');
        }
        
        $("input[name='filter[start-date]']").val(startdate);
        $("input[name='filter[end-date]']").val(enddate);

        $("input[name^='filter[']").first().closest('form').submit();
    });

})(jQuery);
