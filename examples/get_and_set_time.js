var hypertimer = require('../index');

// create a hypertimer with the initial time at 14st of February 2015
var timer = hypertimer({
  time: new Date(2015, 1, 14, 12, 0, 0)
});

// get the time as Date
console.log(timer.getTime());  // Returns a date, Sat Feb 14 2015 12:00:00 GMT+0100 (CET)

// change the time to the 1st of January 2050
timer.config({time: new Date(2050, 0, 1, 12, 0, 0)});

// get the time as Date
console.log(timer.getTime());  // Returns a date, Sat Jan 01 2050 12:00:00 GMT+0100 (CET)

// get the time as timestamp
console.log(timer.now());      // Returns a number, 2524647600000