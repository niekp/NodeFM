(function($){

    $(document).ready(function () {
        $("[data-search='artist']").on('click', function() {
            $('.modal').remove();
            $.get('/library/artist/' + encodeURI(($(this).text())) + '?modal=1', function (data) {
                $('body').append(data);
                $('.modal').modal('show')
                $('body').trigger('modal:loaded');
            });
        });
    });
    
})(jQuery);
