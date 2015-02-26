var hypertimer = require('../../dist/hypertimer');

var time = '2050-01-01T12:00:00';
var timer = hypertimer({
  port: 8081,
  time: time,
  rate: 1/2
});

// set an interval. as soon as the timer is connected to the master timer,
// time and rate will jump to the masters configuration.
var interval = 1000; // milliseconds
timer.setInterval(function () {
  console.log('time', timer.getTime().toISOString());
}, interval, time);
