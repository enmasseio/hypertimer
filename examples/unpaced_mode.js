var hypertimer = require('../index');

// create a hypertimer running discrete events as fast as possible
// in unpaced mode, jumping from event to the next event.
var timer = hypertimer({paced: false});

timer.setTimeout(function () {
  console.log('Timeout A');

  timer.setTimeout(function () {
    console.log('Timeout D');
  }, 20000);

  timer.setTimeout(function () {
    console.log('Timeout B');
  }, 10000);

  timer.setTimeout(function () {
    console.log('Timeout C');
  }, 10000);

}, 10000);

// Because of running in unpaced mode, the application will finish immediately
// and all events are executed in deterministic order.
//
// Output will be:
//   Timeout A
//   Timeout B
//   Timeout C
//   Timeout D
