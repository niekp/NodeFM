(function($){

    $(document).ready(function () {
        setClickEvent();
        $(".table").on('page:loaded', setClickEvent);

    });

    function setClickEvent() {
        $("[data-search='artist'], .artist").unbind('click');
        $("[data-search='artist'], .artist").on('click', function () {
            loadModal(this);
        });
    }

    function loadModal(element) {
        $('body').append('<div class="loader-bg"></div><div class="loader"></div>')
        $('.modal').remove();
        $.get('/library/artist/' + encodeURIComponent(($(element).text())) + '?modal=1', function (data) {
            $(".loader, .loader-bg").remove();
            $('body').append(data);
            $('.modal').modal('show')
            $('body').trigger('modal:loaded');
        }).fail(function () {
            $(".loader, .loader-bg").remove();
            alert('Loading the artist data failed :(');
        })
    }
    
})(jQuery);
