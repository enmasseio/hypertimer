var hypertimer = require('../index');

// create a hypertimer running in discrete time,
// jumping from scheduled event to scheduled event.
var timer = hypertimer({rate: 'discrete'});

timer.setTimeout(function () {
  console.log('Timeout A');

  timer.setTimeout(function () {
    console.log('Timeout B');
  }, 20000);

  timer.setTimeout(function () {
    console.log('Timeout C');
  }, 10000);

  timer.setTimeout(function () {
    console.log('Timeout D');
  }, 10000);

}, 10000);

// Because of running in discrete time, the application will finish immediately
// and all events are executed in deterministic order.
//
// Output will be:
//   Timeout A
//   Timeout C
//   Timeout D
//   Timeout B
