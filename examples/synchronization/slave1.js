var hypertimer = require('../../dist/hypertimer');

// create a hypertimer slave, connect to a master
// all configuration and the current time will be retrieved from the master
// hypertimer
var timer = hypertimer({
  master: 'ws://localhost:8081'
});

timer.on('error', function (err) {
  console.log('Error:', err);
});

timer.on('config', function (config) {
  console.log('Config changed:', JSON.stringify(config));
});

// initially, the system time is returned as we're not yet connected to the master
console.log('start', timer.getTime().toISOString());

// set an interval. as soon as the timer is connected to the master timer,
// time and rate will jump to the masters configuration.
var interval = 1000; // milliseconds
timer.setInterval(function () {
  console.log('time', timer.getTime().toISOString());
}, interval, '2015-01-01');
