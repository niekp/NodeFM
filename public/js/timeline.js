(function ($) {
	$(document).ready(function () {
		drawChart();
	});

	var dynamicColors = function () {
		var r = Math.floor(Math.random() * 255);
		var g = Math.floor(Math.random() * 255);
		var b = Math.floor(Math.random() * 255);
		return "rgb(" + r + "," + g + "," + b + ")";
	};

	function drawChart() {

		let labels = [];
		let data = [];

		// Build array of the table data
		$("table tbody tr").each(function () {
			let $tr = $(this);
			let period = $tr.find("[data-id='period']").html();
			let artist = $tr.find("[data-search='artist']").html();
			let scrobbles = $tr.find("[data-scrobbles]").data('scrobbles');

			if (labels.indexOf(period) < 0)
				labels.push(period);

			if (!data[artist]) {
				data[artist] = [];
			}

			data[artist][period] = scrobbles;
		});

		// Fill up the empty spots in the array
		let new_data = [];
		for (artist in data) {
			for (period of labels) {
				if (!data[artist][period]) {
					data[artist][period] = null;
				}
			}

			new_data[artist] = [];
			for (period of labels) {
				new_data[artist].push(data[artist][period])
			}
		}

		data = new_data;
		
		// Build datasets from the data
		let datasets = [];
		for (artist in data) {
			let color = dynamicColors();

			datasets.push({
				label: artist,
				backgroundColor: color,
				borderColor: color,
				data: data[artist].reverse(), // Reverse the data (and the labels)
				fill: false,
			});
		}
		
		var ctx = document.getElementById('chart').getContext('2d');
		var chart = new Chart(ctx, {
			// The type of chart we want to create
			type: 'line',

			data: {
				labels: labels.reverse(),
				datasets: datasets
			},
			
			options: {
				legend: {
					display: false
				},
				responsive: true,
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
				scales: {
					xAxes: [{
						display: true,
						scaleLabel: {
							display: true,
							labelString: 'Period'
						}
					}],
					yAxes: [{
						display: true,
						scaleLabel: {
							display: true,
							labelString: 'Scrobbles'
						}
					}]
				}
			}

		});
	}

})(jQuery);
