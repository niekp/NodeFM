(function ($) {
	$(document).ready(function () {
		let url = $('#timeline-chart[data-source]').data('source');
		$.get(url, function (data) {
			drawChart(data);
		});
	});

	var dynamicColors = function () {
		var r = Math.floor(Math.random() * 255);
		var g = Math.floor(Math.random() * 255);
		var b = Math.floor(Math.random() * 255);
		return "rgb(" + r + "," + g + "," + b + ")";
	};

	function drawChart(json) {
		let labels = [];
		let data = [];

		// Build array of the table data
		json.forEach(function (row) {
			let period = row.period;
			let artist = row.artist;
			let scrobbles = row.scrobbles;

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
					data[artist][period] = 0;
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
		
		var ctx = document.getElementById('timeline-chart').getContext('2d');
		new Chart(ctx, {
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
					position: 'nearest',
					intersect: false,
					callbacks: {
						label: function (tooltipItem, data) {
							const tooltip = data.datasets[tooltipItem.datasetIndex];
							const value = tooltip.data[tooltipItem.index];
							return value === 0 ? null : tooltip.label + ': ' + value;
						}
					},
					itemSort: (a, b, data) => b.yLabel - a.yLabel
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
				},
				elements: {
					point: {
						radius: 0
					}
				},
			}

		});
	}

})(jQuery);
