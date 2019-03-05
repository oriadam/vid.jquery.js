# vid.jquery.js
jQuery video player that supports trimming the original video to chunks.
Support starting the video from a specific point and make it look like it is the start of the video.
For example if you pass `video_start_time: 10` the time shown as "00:02" is actualy second 12 of the video.

Usage: 

    $('<div>').vid({src: 'http://example.com/example.mp4', context_menu: false, trim_timeline: true, video_start_time: 10, video_end_time: 300});
  
Available functions:

    $elem.vid('play');
    $elem.vid('stop');
    $elem.vid('rerun');
    $elem.vid('toggle');
    $elem.vid('volume',0.5);

Dependencies:

- jQuery
- fontawesome (todo)
