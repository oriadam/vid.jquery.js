var tpl = {
		zero_pad_number: function (number)
		{
			if (('' + number).length === 1)
				return '0' + number;
			else
				return number;
		},

		time2seconds: function (time)
		{
			if (!/:/.test(time))
				return +time;
			time = time.split(':');
			while (time.length < 3)
				time.unshift(0);
			return (+time[0] * 60 * 60 || 0) + (+time[1] * 60 || 0) + (+time[2] || 0);
		},

		seconds2time: function (seconds, h_mandatory)
		{
			seconds = tpl.time2seconds(seconds);
			let h = Math.floor(seconds / 3600);
			if (h_mandatory)
				h = tpl.zero_pad_number(h);
			let m = Math.floor((seconds % 3600) / 60);
			let s = Math.floor(seconds) % 60;
			return (h ? h + ':' : '') + tpl.zero_pad_number(m) + ':' + tpl.zero_pad_number(s);
		},
	};
