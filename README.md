# vid.jquery.js
jQuery video/audio player that supports trimming (cropping) the original video/audio from start or end.
Support starting the video from a specific point and make it look like it is the start of the video, and same for end of video.
For example if you pass `video_start_time: 10` the time shown as "00:02" is actualy second 12 of the video.

Usage: 

    $('<div>').vid({src: 'http://example.com/example.mp4', context_menu: false, trim_timeline: true, video_start_time: 10, video_end_time: 300});
    $('<div>').vid({audio: true, src: 'http://example.com/example.ogg', context_menu: false, audio_equalizer: true, audio_equalizer_bars: 14});
    

Available functions:

    $elem.vid('play');
    $elem.vid('stop');
    $elem.vid('rerun');
    $elem.vid('toggle');
    $elem.vid('volume',0.5);

Dependencies:

- jQuery
- fontawesome (todo)
