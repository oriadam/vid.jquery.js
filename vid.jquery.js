/* video player
Usage: $('<div>').vid({src: 'http://example.com/example.mp4', context_menu: false, trim_timeline: true, video_start_time: 10, video_end_time: 300});
Available functions:
$elem.vid('play');
$elem.vid('stop');
$elem.vid('rerun');
$elem.vid('toggle');
$elem.vid('volume',0.5);

*/
;(function ($, window, undefined)
{
	"use strict";
	let tpl = {
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
	
	let pluginName = 'vid',
		$el, $vid, vid, $controls, $track, $bar, $thumb, $vol,
		track_bg_unloaded = '#ddd', // from vid.jquery.less @track_bg_unloaded
		track_bg_loaded = '#20AE61', // from vid.jquery.less @track_bg_loaded
		options,
		defaults = {
			src: undefined, // mandatory - src of the video
			trim_timeline: true, // when trim is active, show the timeline and current time of video relative to the trimmed section
			video_start_time: undefined, // trim
			video_end_time: undefined, // trim
			context_menu: true, // allow context menu
		};

	// The actual plugin constructor
	function Plugin(element, _options)
	{
		$el = $(element);
		options = $.extend({}, defaults, _options);
		this._name = pluginName;
		this.init();
	}

	Plugin.prototype.play = function ()
	{
		vid.play();
	};

	Plugin.prototype.rerun = function ()
	{
		vid.currentTime = options.trim_start;
		this.play();
	};

	function onPlay()
	{
		if (vid.currentTime < options.trim_start)
			vid.currentTime = options.trim_start;
		if (options.trim_end && vid.currentTime > options.trim_end)
			this.stop();
		$el.addClass('vid-playing').removeClass('vid-paused vid-ended');
	}

	function onTimeupdate()
	{
		let current = Math.max(0, vid.currentTime - options.trim_start);
		let ratio = Math.min(1, Math.max(0, current / calculate_duration()));
		$controls.find('.vid-ctrl-time').html(tpl.seconds2time(current, true));
		if (options.trim_end && vid.currentTime >= options.trim_end)
		{
			this.stop();
			$vid.trigger('ended');
		}
		$thumb.css('left', 'calc(' + (ratio * 100) + '% - ' + (($thumb.width() / 2) * ratio) + 'px )');
	}

	function onCanplay()
	{
		if (vid.currentTime < options.trim_start)
			vid.currentTime = options.trim_start;
		$vol.val(vid.volume);
		if (options.auto_play && vid.readyState == 4 && vid.paused)
			vid.play();
		$controls.width($vid.width());
		let ctrl_width = 12;
		$controls.find('>div:not(.vid-ctrl-track)').each(function(){
			ctrl_width += $(this).outerWidth(true);
		});
		$controls.find('.vid-ctrl-track').outerWidth($controls.width() - ctrl_width);
	}

	function onPause()
	{
		$el.removeClass('vid-playing vid-ended').addClass('vid-paused');
	}

	Plugin.prototype.stop = function ()
	{
		if (vid.readyState == 4)
			vid.pause();
	};

	Plugin.prototype.toggle = function ()
	{
		vid.paused ? this.play() : this.stop();
	}

	function onEnded(e)
	{
		$el.removeClass('vid-playing vid-paused').addClass('vid-ended');
	}

	function seek_relative(span)
	{
		seek(Math.max(options.trim_start, Math.min(options.trim_end || vid.duration, vid.currentTime + span)));
	}

	function seek(whereto)
	{
		let playing = !vid.paused;
		if (Math.abs(vid.currentTime - whereto) > 0.1)
		{
			if (vid.readyState == 4) vid.pause();
			vid.currentTime = whereto;
			if (playing)
				vid.play();
		}
		$el.removeClass('vid-ended').toggleClass('vid-playing', playing).toggleClass('vid-paused', !playing);
	}

	function onKey(e)
	{
		if (!$vid.is(':visible'))
			return;
		switch (e.keyCode)
		{
			case 32: // spacebar
				this.toggle();
				e.preventDefault(); // without this the screen scrolls
				break;
			case 39: // right arrow
				seek_relative(5);
				e.preventDefault(); // without this the screen scrolls
				break;
			case 37: // left arrow
				seek_relative(-5);
				e.preventDefault(); // without this the screen scrolls
				break;
		}
	}

	Plugin.prototype.volume = function (val)
	{
		if (val !== undefined)
		{
			vid.volume = val;
			$el.toggleClass('vid-muted', !vid.volume);
		}
		return vid.volume;
	};

	function onVolumeChange()
	{
		this.volume($vol.val());
	}

	function calculate_duration()
	{
		return (options.trim_end || vid.duration) - options.trim_start;
	}

	function calculate_relative_time(e)
	{
		return (e.offsetX / $(e.currentTarget).width() * calculate_duration());
	}

	function onTrackDown(e)
	{
	}

	function onTrackMove(e)
	{
		let relative_time = calculate_relative_time(e);
		let title_left = e.offsetX + $track.offset().left;
		$('.blsm-title-box').css({left: title_left - 17, right: ''}).find('>div').html(tpl.seconds2time(relative_time));
	}

	function onTrackUp(e)
	{
		seek(options.trim_start + calculate_relative_time(e));
	}

	function onProgress()
	{
		let gradient = ['to right'];
		let duration = calculate_duration();
		for (let i = 0; i < vid.buffered.length; i++)
		{
			let relative_start = Math.max(0, vid.buffered.start(i) - options.trim_start);
			let relative_end = vid.buffered.end(i) - options.trim_start;
			if (relative_end > 0)
			{
				if (options.trim_end)
					relative_end = Math.min(options.trim_end, relative_end);
				let from = ' ' + (relative_start * 100 / duration) + '%';
				let to = ' ' + (relative_end * 100 / duration) + '%';
				gradient.push(
					track_bg_unloaded + from,
					track_bg_loaded + from,
					track_bg_loaded + to,
					track_bg_unloaded + to);
			}
		}
		$bar.css('background-image', 'linear-gradient(' + gradient.join(',') + ')');
	}

	Plugin.prototype.init = function ()
	{
		let _this = this;
		$vid = $('<video></video>').appendTo($el);
		vid = $vid[0];
		$controls = $('<div class="vid-controls">\
				<div class="vid-ctrl-play"><span class="vid-btn icon icon-play"></span><span class="vid-btn icon icon-pause"></span><span class="vid-btn icon icon-reload"></span></div>\
				<div class="vid-ctrl-time"></div>\
				<div class="vid-ctrl-vol"><span class="vid-btn icon icon-volume"></span><span class="vid-btn icon icon-volume_mute"></span><input class="vid-ctrl-volume-input" type="range" min="0" max="1" step="0.01" orient="vertical"/></div>\
				<div class="vid-ctrl-track" title=" "><div class="vid-ctrl-bar"></div><div class="vid-ctrl-thumb"></div></div>\
			</div>').appendTo($el);
		$track = $controls.find('.vid-ctrl-track');
		$bar = $controls.find('.vid-ctrl-bar');
		$thumb = $controls.find('.vid-ctrl-thumb');
		$vol = $controls.find('.vid-ctrl-volume-input');
		let media_fragment_rx = /#t=([\d:.]+)(?:,([\d:.]+))?/;
		if (media_fragment_rx.test(options.src))
		{
			let media_fragments = options.src.match(media_fragment_rx);
			options.video_start_time = tpl.time2seconds(media_fragments[1]) || 0;
			options.video_end_time = tpl.time2seconds(media_fragments[2]) || undefined;
			options.src = options.src.replace(media_fragment_rx, '');
		}
		options.trim_start = tpl.time2seconds(options.video_start_time) || 0;
		options.trim_end = tpl.time2seconds(options.video_end_time);
		$vid.attr('src', options.src)
			.on('click', $.proxy(this.toggle, this))
			.on('pause', $.proxy(onPause, this))
			.on('play', $.proxy(onPlay, this))
			.on('ended', $.proxy(onEnded, this))
			.on('canplay canplaythrough', $.proxy(onCanplay, this))
		// .on('seeked timeupdate', $.proxy(onTimeupdate, this))  	// moved to interval
		// .on('progress', $.proxy(onProgress, this)) 				// moved to interval
		;
		if (!options.context_menu)
			$vid.on('contextmenu', function(e) {
				e.preventDefault();
			});
		let $play = $controls.find('.vid-ctrl-play');
		$play.find('.icon-pause').click($.proxy(this.stop, this));
		$play.find('.icon-play').click($.proxy(this.play, this));
		$play.find('.icon-reload').click($.proxy(this.rerun, this));
		$vol.change($.proxy(onVolumeChange, this));
		$track.on('mousedown', $.proxy(onTrackDown, this)).on('mousemove mouseover', $.proxy(onTrackMove, this)).on('mouseup', $.proxy(onTrackUp, this));
		$(window).on('keydown', $.proxy(onKey, this));
		$el.addClass('vid-player vid-paused');
		let interval = setInterval(function ()
		{
			if (!$vid || !$vid.parent())
				return clearInterval(interval);
			if (!$vid.is(':visible'))
				return;
			onProgress.call(_this);
			onTimeupdate.call(_this);
		}, 100);
		onTimeupdate();
	};

	// A really lightweight plugin wrapper around the constructor,
	// preventing against multiple instantiations
	$.fn[pluginName] = function (options)
	{
		let args = arguments;
		let res;
		this.each(function ()
		{
			let plgn = $.data(this, pluginName);
			if (!plgn)
				$.data(this, pluginName, new Plugin(this, options));
			else if (typeof options == 'string' && (options in Plugin.prototype))
				res = plgn[options].apply(plgn, Array.prototype.slice.call(args, 1));
			else
				res = plgn.init();

		});
		return res === undefined ? this : res;
	};

}(jQuery, window));
