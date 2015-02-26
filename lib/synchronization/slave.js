var WebSocket = require('./WebSocket');
var Promise = require('../Promise');
var emitterify = require('./../emitterify');
var stat = require('./stat');
var util = require('./util');

// TODO: make these constants configurable
var INTERVAL = 3600000; // once an hour
var DELAY = 1000;       // delay between individual requests
var REPEAT = 5;         // number of times to request the time for determining latency

exports.createSlave = function (url) {
  var ws = new WebSocket(url);
  var slave = emitterify(ws);
  var isFirst = true;
  var syncTimer = null;

  ws.onopen = function () {
    sync();
    syncTimer = setInterval(sync, INTERVAL);
  };

  slave.destroy = function () {
    clearInterval(syncTimer);
    syncTimer = null;

    ws.close();
    ws = null;
  };

  /**
   * Sync with the time of the master
   * @return {Promise.<number | null>}  Resolves with the time of the master,
   *                                    or null if failed to sync
   * @private
   */
  function sync() {
    // retrieve latency, then wait 1 sec
    function getLatencyAndWait() {
      var result = null;
      return getLatency(slave)
          .then(latency => result = latency)  // store the retrieved latency
          .catch(err => console.log(err))     // just ignore failed requests
          .then(() => util.wait(DELAY))       // wait 1 sec
          .then(() => result);                // return the retrieved latency
    }

    return util
        .repeat(getLatencyAndWait, REPEAT)
        .then(function (all) {
          // filter away failed requests
          var latencies = all.filter(latency => latency !== null);

          // calculate the limit for outliers
          var limit = stat.median(latencies) + stat.std(latencies);

          // filter away outliers: all latencies largereq than the mean+std
          var filtered = latencies.filter(latency => latency < limit);

          // return the mean latency
          return (filtered.length > 0) ? stat.mean(filtered) : null;
        })
        .then(function (latency) {
          return slave.request('time').then(function (timestamp) {
            var time = timestamp + latency;
            slave.emit('change', time);
            return time;
          });
        })
        .catch(err => slave.emit('error', err));
  }

  /**
   * Request the time of the master and calculate the latency from the
   * roundtrip time
   * @param {{request: function}} emitter
   * @returns {Promise.<number | null>} returns the latency
   * @private
   */
  function getLatency(emitter) {
    var start = Date.now();

    return emitter.request('time')
        .then(function (timestamp) {
          var end = Date.now();
          var latency = (end - start) / 2;
          var time = timestamp + latency;

          // apply the first ever retrieved offset immediately.
          if (isFirst) {
            isFirst = false;
            emitter.emit('change', time);
          }

          return latency;
        })
  }

  return slave;
};

