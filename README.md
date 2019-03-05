# vid.jquery.js
jQuery video player that supports trimming the video

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
