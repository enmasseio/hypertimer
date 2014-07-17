var hypertimer = require('../index');

// create a hypertimer running ten times faster than real-time
var timer = hypertimer({rate: 10});

// start the timer at 1st of January 2050
timer.setTime(new Date(2050, 0, 1, 12, 0, 0));

console.log('start', timer.getTime()); // Sat Jan 01 2050 12:00:00 GMT+0100 (CET)

// set a timeout after a delay
var delay = 10000; // milliseconds (hyper-time)
var id1 = timer.setTimeout(function () {
  console.log('timeout', timer.getTime()); // timeout Sat Jan 01 2050 12:00:10 GMT+0100 (CET)
}, delay);

// set a timeout at a specific time
var time = new Date(2050, 0, 1, 12, 0, 20); // time (hyper-time)
var id2 = timer.setTrigger(function () {
  console.log('trigger', timer.getTime()); // trigger Sat Jan 01 2050 12:00:20 GMT+0100 (CET)
}, time);

// set an interval
var interval = 5000; // milliseconds (hyper-time)
var firstTime = new Date(2050, 0, 1, 12, 0, 30); // optional first time (hyper-time)
var counter = 0;
var id3 = timer.setInterval(function () {
  console.log('interval', timer.getTime()); // interval, 12:00:30, 12:00:35, 12:00:40, etc ...

  // cancel the interval after 10 times
  counter++;
  if (counter > 10) {
    timer.clearInterval(id3);
  }
}, interval, firstTime);