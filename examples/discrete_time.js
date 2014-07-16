var hypertimer = require('../index');

// create a hypertimer running in discrete time, jumping from scheduled event
// to scheduled event.
var timer = hypertimer({rate: 'discrete'});

timer.setTimeout(function () {
  console.log('A');

  timer.setTimeout(function () {
    console.log('B');
  }, 2000);

  timer.setTimeout(function () {
    console.log('C');
  }, 1000);

  timer.setTimeout(function () {
    console.log('D');
  }, 1000);

}, 1000);

// Because of running in discrete time, the application will finish immediately
// and all events are executed in deterministic order.
//
// Output will be: A C D B
