var hypertimer = require('../index');

// create a hypertimer
var timer = hypertimer();

// set the time at 1st of January 2050
timer.setTime(new Date(2050, 0, 1, 12, 0, 0));

// get the time as Date
console.log(timer.getTime());  // Returns a date, Sat Jan 01 2050 12:00:00 GMT+0100 (CET)

// get the time as timestamp
console.log(timer.now());      // Returns a number, approximately 2524647600000
