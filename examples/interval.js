var hypertimer = require('../index');

// create a hypertimer running four times slower than real-time
var timer = hypertimer({rate: 1/4});

// start the timer at 1st of January 2014
timer.setTime(new Date(2014, 0, 1, 12, 0, 0));

// set an interval to print the hyper time on screen
var interval = 1000; // milliseconds in hyper time
timer.setInterval(function () {
  console.log(timer.getTime());
}, interval);

console.log('Running a hypertimer four times slower than real-time...\n');
