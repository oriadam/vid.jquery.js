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

	var pluginName = 'vid',
		defaults = {
			track_bg_unloaded: '#ddd', // from vid.jquery.less @track_bg_unloaded
			track_bg_loaded: '#20AE61', // from vid.jquery.less @track_bg_loaded
			src: undefined, // mandatory - src of the video
			trim_timeline: true, // when trim is active, show the timeline and current time of video relative to the trimmed section
			video_start_time: undefined, // trim
			video_end_time: undefined, // trim
			context_menu: true, // allow context menu
			minWidth: 300,
			auto_play: undefined,
			audio: undefined, // use <audio> instead of <video>
			audio_equalizer: true,
			audio_equalizer_bars: 10
		};

	// The actual plugin constructor
	function Plugin(element, _options)
	{
		this.$el = $(element);
		this.options = $.extend({}, defaults, _options);
		this._name = pluginName;
		this.init();
	}

	Plugin.prototype.play = function ()
	{
		let vid = this.$vid[0];
		vid.play();
	};

	Plugin.prototype.rerun = function ()
	{
		let options = this.options;
		let vid = this.$vid[0];
		vid.currentTime = options.trim_start;
		this.play();
	};

	function onPlay()
	{
		let options = this.options;
		let vid = this.$vid[0];
		if (vid.currentTime < options.trim_start)
			vid.currentTime = options.trim_start;
		if (options.trim_end && vid.currentTime > options.trim_end)
			this.stop();
		this.$el.addClass('vid-playing').removeClass('vid-paused vid-ended');
	}

	function onTimeupdate()
	{
		let options = this.options;
		let vid = this.$vid[0];
		let current = Math.max(0, vid.currentTime - options.trim_start);
		let ratio = Math.min(1, Math.max(0, current / calculate_duration.call(this)));
		this.$el.find('.vid-ctrl-time').html(tpl.seconds2time(current, true));
		if (options.trim_end && vid.currentTime >= options.trim_end)
		{
			this.stop();
			this.$vid.trigger('ended');
		}
		let $thumb = this.$el.find('.vid-ctrl-thumb');
		$thumb.css('left', 'calc(' + (ratio * 100) + '% - ' + (($thumb.width() / 2) * ratio) + 'px )');
	}

	function onCanplay()
	{
		let options = this.options;
		let vid = this.$vid[0];
		if (vid.currentTime < options.trim_start)
			vid.currentTime = options.trim_start;
		this.$el.find('.vid-ctrl-volume-input').val(vid.volume);
		if (options.auto_play && vid.readyState == 4 && vid.paused)
			vid.play();
		let $controls = this.$el.find('.vid-controls');
		$controls.width(Math.max(this.$vid.width(), this.options.minWidth));
		let ctrl_width = 12;
		$controls.find('>div:not(.vid-ctrl-track)').each(function(){
			ctrl_width += $(this).outerWidth(true);
		});
		$controls.find('.vid-ctrl-track').outerWidth($controls.width() - ctrl_width);
	}

	function onPause()
	{
		this.$el.removeClass('vid-playing vid-ended').addClass('vid-paused');
	}

	Plugin.prototype.stop = function ()
	{
		let vid = this.$vid[0];
		if (vid.readyState == 4)
			vid.pause();
	};

	Plugin.prototype.toggle = function ()
	{
		let vid = this.$vid[0];
		vid.paused ? this.play() : this.stop();
	};

	function onEnded(e)
	{
		this.$el.removeClass('vid-playing vid-paused').addClass('vid-ended');
	}

	function seek_relative(span)
	{
		seek(Math.max(options.trim_start, Math.min(options.trim_end || vid.duration, vid.currentTime + span)));
	}

	function seek(whereto)
	{
		let vid = this.$vid[0];
		let playing = !vid.paused;
		if (Math.abs(vid.currentTime - whereto) > 0.1)
		{
			if (vid.readyState == 4) vid.pause();
			vid.currentTime = whereto;
			if (playing)
				vid.play();
		}
		this.$el.removeClass('vid-ended').toggleClass('vid-playing', playing).toggleClass('vid-paused', !playing);
	}

	function onKey(e)
	{
		if (!this.$vid.is(':visible'))
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
		let vid = this.$vid[0];
		if (val !== undefined)
		{
			vid.volume = val;
			this.$el.toggleClass('vid-muted', !vid.volume);
		}
		return vid.volume;
	};

	function onVolumeChange()
	{
		this.volume(this.$el.find('.vid-ctrl-volume-input').val());
	}

	function calculate_duration()
	{
		let options = this.options;
		let vid = this.$vid[0];
		return (options.trim_end || vid.duration) - options.trim_start;
	}

	function calculate_relative_time(e)
	{
		return (e.offsetX / $(e.currentTarget).width() * calculate_duration.call(this));
	}

	function onTrackDown(e)
	{
	}

	function onTrackMove(e)
	{
		let $track = this.$el.find('.vid-ctrl-track');
		let relative_time = calculate_relative_time.call(this, e);
		let $tooltip = $track.find('.vid-ctrl-tooltip');
		if (relative_time >= 0 && e.offsetX)
			$tooltip.css('left', e.offsetX).html(tpl.seconds2time(relative_time)).show();
		else
			$tooltip.hide();
	}

	function onTrackUp(e)
	{
		seek.call(this, this.options.trim_start + calculate_relative_time.call(this, e));
	}

	function onProgress()
	{
		let options = this.options;
		let vid = this.$vid[0];
		let gradient = ['to right'];
		let duration = calculate_duration.call(this);
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
					options.track_bg_unloaded + from,
					options.track_bg_loaded + from,
					options.track_bg_loaded + to,
					options.track_bg_unloaded + to);
			}
		}
		this.$el.find('.vid-ctrl-bar').css('background-image', 'linear-gradient(' + gradient.join(',') + ')');
	}

	Plugin.prototype.init = function ()
	{
		let _this = this;
		let options = this.options;
		let $el = this.$el;
		this.$vid = $(options.audio ? '<audio>' : '<video>').appendTo($el);
		let $vid = this.$vid;
		if (this.options.audio)
		{
			$el.addClass('vid-is-audio');
			if (this.options.audio_equalizer)
			{
				let $eqalizer = $('<div class="vid-equalizer"></div>').appendTo($el);
				for (let i = 0; i < this.options.audio_equalizer_bars; i++)
					$eqalizer.append('<i></i>');
			}
		}
		$('<div class="vid-controls">\
				<div class="vid-ctrl-play"><span class="vid-btn icon icon-play"></span><span class="vid-btn icon icon-pause"></span><span class="vid-btn icon icon-reload"></span></div>\
				<div class="vid-ctrl-time"></div>\
				<div class="vid-ctrl-vol"><span class="vid-btn icon icon-volume"></span><span class="vid-btn icon icon-volume_mute"></span><input class="vid-ctrl-volume-input" type="range" min="0" max="1" step="0.01" orient="vertical"/></div>\
				<div class="vid-ctrl-track"><div class="vid-ctrl-bar"></div><div class="vid-ctrl-thumb"></div><div class="vid-ctrl-tooltip"></div></div>\
			</div>').appendTo($el);
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
		let $play = $el.find('.vid-ctrl-play');
		$play.find('.icon-pause').click($.proxy(this.stop, this));
		$play.find('.icon-play').click($.proxy(this.play, this));
		$play.find('.icon-reload').click($.proxy(this.rerun, this));
		$el.find('.vid-ctrl-volume-input').change($.proxy(onVolumeChange, this));
		$el.find('.vid-ctrl-track').on('mousedown', $.proxy(onTrackDown, this)).on('mouseenter mousemove', $.proxy(onTrackMove, this)).on('mouseup', $.proxy(onTrackUp, this));
		$el.on('keydown', $.proxy(onKey, this));
		$el.addClass('vid-player vid-paused');
		this.interval = setInterval($.proxy(function ()
		{
			if (!this.$el || !this.$el.parent())
				return clearInterval(this.interval);
			if (!this.$el.is(':visible'))
				return;
			onProgress.call(this);
			onTimeupdate.call(this);
		}, this), 300);
		onTimeupdate.call(_this);
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