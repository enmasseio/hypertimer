var hypertimer = require('../index');

// create a hypertimer running ten times faster than real-time
var timer = hypertimer({rate: 10});

// start the timer at 1st of January 2050
timer.setTime(new Date(2050, 0, 1, 12, 0, 0));

// set a timeout on a specific time
var time = new Date(2050, 0, 1, 12, 0, 30); // 30 seconds later
timer.setTrigger(function () {
  console.log('Trigger!');
  console.log('The time is: ' + timer.getTime());
}, time);

console.log('The time is: ' + timer.getTime());
