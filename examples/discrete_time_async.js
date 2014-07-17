var http = require('http');
var hypertimer = require('../index');

// create a hypertimer running in discrete time,
// jumping from scheduled event to scheduled event.
var timer = hypertimer({rate: 'discrete'});

/**
 * Get the current temperature in a specific place
 * Whether data is retrieved from http://openweathermap.org/
 * @param {String} where        For example 'rotterdam,nl'
 * @param {function} callback   Called as callback(err, temp)
 */
function getTemperatureIn(where, callback) {
  var options = {
    host: 'api.openweathermap.org',
    path: '/data/2.5/weather?q=' + where
  };

  // perform an asynchronous action inside a timeout
  http.get(options, function(res) {
    var body = '';
    res.on('data', function(chunk) {
      body += chunk;
    });
    res.on('end', function() {
      var data = JSON.parse(body);
      var tempK = data.main.temp;
      var tempC = tempK - 273.15;
      callback(null, Math.round(tempC * 100) / 100);
    });
  }).on('error', callback);
}

// create an asynchronous timeout, having a callback parameter done
timer.setTimeout(function (done) {
  console.log('Timeout A');

  // perform an asynchronous action inside the timeout
  getTemperatureIn('rotterdam,nl', function (err, temp) {
    console.log('The temperature in Rotterdam is ' + temp + ' celsius');

    // create another timeout inside the asynchronous timeout
    timer.setTimeout(function () {
      console.log('Timeout B');
    }, 10000);

    // once we are done with our asynchronous event, call done()
    // so the hypertimer knows he can continue with a next event.
    done();
  });
}, 10000);

// schedule two other events, where Timeout B occurs at the same time as
// Timeout A, and Timeout D occurs at the same time as Timeout B.
timer.setTimeout(function () {
  console.log('Timeout C');

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
//   Timeout B
//   Timeout D
//
// Without asynchronous timeout, the order would have been A C D B due to
// the asynchronous task inside Timeout B.
