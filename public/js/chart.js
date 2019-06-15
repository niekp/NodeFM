(function ($) {
    $(document).ready(function () {
        drawChart();

        $('body').on('modal:loaded', function () {
            drawChart();
        });

    });

    function drawChart() {
        $(".chart[data-source]").each(function () {
            let url = $(this).data('source');
            let canvas = $(this)[0];

            $.get(url, function(result) {
                let labels = [];
                let data = [];
                for (row of result) {
                    labels.push(row.label);
                    data.push(row.value);
                }

                var ctx = canvas.getContext('2d');
                
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: labels,
                        datasets: [{
                            data: data,
                            backgroundColor: 'rgb(66,139,202)',
                            borderWidth: 0
                        }]
                    },
                    options: {
                        legend: {
                            display: false
                        },
                        responsive: false,
                        title: {
                            display: false,
                        },
                        tooltips: {
                            mode: 'index',
                            intersect: false,
                        },
                        hover: {
                            mode: 'nearest',
                            intersect: true
                        },
                        elements: {
                            point: {
                                radius: 0
                            }
                        }
                    }

                });

            });
        });

    }

})(jQuery);
