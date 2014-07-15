var hypertimer = require('../index');

// create a hypertimer running ten times faster than real-time
var timer = hypertimer({rate: 10});

// start the timer at 1st of January 2050
timer.setTime(new Date(2050, 0, 1, 12, 0, 0));

// set a timeout after a delay
var delay = 10000; // milliseconds (hyper-time)
timer.setTimeout(function () {
  console.log('Timeout!');
  console.log('It is now ' + delay + ' ms later in hyper-time, ' +
      'the time is: ' + timer.getTime());
}, delay);

console.log('The time is: ' + timer.getTime());
