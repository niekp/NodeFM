(function($){

    $(document).ready(function () {
        $("[data-search='artist'], .artist").on('click', setClickEvent);

        $(".table").on('page:loaded', setClickEvent);

    });

    function setClickEvent() {
        $("[data-search='artist'], .artist").unbind('click');
        $("[data-search='artist'], .artist").on('click', function () {
            loadModal(this);
        });
    }

    function loadModal(element) {
        $('.modal').remove();
        $.get('/library/artist/' + encodeURI(($(element).text())) + '?modal=1', function (data) {
            $('body').append(data);
            $('.modal').modal('show')
            $('body').trigger('modal:loaded');
        });
    }
    
})(jQuery);
