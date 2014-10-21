var util = require('./util');

// enum for type of timeout
var TYPE = {
  TIMEOUT: 0,
  INTERVAL: 1,
  TRIGGER: 2
};

var DISCRETE = 'discrete';

/**
 * Create a new hypertimer
 * @param {Object} [options]  The following options are available:
 *                            rate: number | 'discrete'
 *                                        The rate of speed of hyper time with
 *                                        respect to real-time in milliseconds
 *                                        per millisecond. Rate must be a
 *                                        positive number, or 'discrete' to
 *                                        run in discrete time (jumping from
 *                                        event to event). By default, rate is 1.
 *                            deterministic: boolean
 *                                        If true (default), simultaneous events
 *                                        are executed in a deterministic order.
 */
function hypertimer(options) {
  // options
  var rate = 1;             // number of milliseconds per milliseconds
  var deterministic = true; // run simultaneous events in a deterministic order

  // properties
  var running = false;   // true when running
  var realTime = null;   // timestamp. the moment in real-time when hyperTime was set
  var hyperTime = null;  // timestamp. the start time in hyper-time
  var timeouts = [];     // array with all running timeouts
  var current = {};      // the timeouts currently in progress (callback is being executed)
  var timeoutId = null;  // currently running timer
  var idSeq = 0;         // counter for unique timeout id's

  // exported timer object with public functions and variables
  var timer = {};

  /**
   * Change configuration options of the hypertimer, or retrieve current
   * configuration.
   * @param {Object} [options]  The following options are available:
   *                            rate: number | 'discrete'
   *                                        The rate of speed of hyper time with
   *                                        respect to real-time in milliseconds
   *                                        per millisecond. Rate must be a
   *                                        positive number, or 'discrete' to
   *                                        run in discrete time (jumping from
   *                                        event to event). By default, rate is 1.
   *                            deterministic: boolean
   *                                        If true (default), simultaneous events
   *                                        are executed in a deterministic order.
   * @return {Object} Returns the applied configuration
   */
  timer.config = function(options) {
    if (options) {
      if ('rate' in options) {
        var newRate = (options.rate === DISCRETE) ? DISCRETE : Number(options.rate);
        if (newRate !== DISCRETE && (isNaN(newRate) || newRate <= 0)) {
          throw new TypeError('rate must be a positive number or the string "discrete"');
        }
        hyperTime = timer.now();
        realTime = util.systemNow();
        rate = newRate;
      }
      if ('deterministic' in options) {
        deterministic = options.deterministic ? true : false;
      }
    }

    // reschedule running timeouts
    _schedule();

    // return a copy of the configuration options
    return {
      rate: rate,
      deterministic: deterministic
    };
  };

  /**
   * Set the time of the timer. To get the current time, use getTime() or now().
   * @param {number | Date} time  The time in hyper-time.
   */
  timer.setTime = function (time) {
    if (time instanceof Date) {
      hyperTime = time.valueOf();
    }
    else {
      var newTime = Number(time);
      if (isNaN(newTime)) {
        throw new TypeError('time must be a Date or number');
      }
      hyperTime = newTime;
    }

    // reschedule running timeouts
    _schedule();
  };

  /**
   * Returns the current time of the timer as a number.
   * See also getTime().
   * @return {number} The time
   */
  timer.now = function () {
    if (rate === DISCRETE) {
      return hyperTime;
    }
    else {
      if (running) {
        // TODO: implement performance.now() / process.hrtime(time) for high precision calculation of time interval
        var realInterval = util.systemNow() - realTime;
        var hyperInterval = realInterval * rate;
        return hyperTime + hyperInterval;
      }
      else {
        return hyperTime;
      }
    }
  };

  /**
   * Continue the timer.
   */
  timer['continue'] = function() {
    realTime = util.systemNow();
    running = true;

    // reschedule running timeouts
    _schedule();
  };

  /**
   * Pause the timer. The timer can be continued again with `continue()`
   */
  timer.pause = function() {
    hyperTime = timer.now();
    realTime = null;
    running = false;

    // reschedule running timeouts (pauses them)
    _schedule();
  };

  /**
   * Returns the current time of the timer as Date.
   * See also now().
   * @return {Date} The time
   */
// rename to getTime
  timer.getTime = function() {
    return new Date(timer.now());
  };

  /**
   * Get the value of the hypertimer. This function returns the result of getTime().
   * @return {Date} current time
   */
  timer.valueOf = timer.getTime;

  /**
   * Return a string representation of the current hyper-time.
   * @returns {string} String representation
   */
  timer.toString = function () {
    return timer.getTime().toString();
  };

  /**
   * Set a timeout, which is triggered when the timeout occurs in hyper-time.
   * See also setTrigger.
   * @param {Function} callback   Function executed when delay is exceeded.
   * @param {number} delay        The delay in milliseconds. When the delay is
   *                              smaller or equal to zero, the callback is
   *                              triggered immediately.
   * @return {number} Returns a timeoutId which can be used to cancel the
   *                  timeout using clearTimeout().
   */
  timer.setTimeout = function(callback, delay) {
    var id = idSeq++;
    var timestamp = timer.now() + delay;
    if (isNaN(timestamp)) {
      throw new TypeError('delay must be a number');
    }

    // add a new timeout to the queue
    _queueTimeout({
      id: id,
      type: TYPE.TIMEOUT,
      time: timestamp,
      callback: callback
    });

    // reschedule the timeouts
    _schedule();

    return id;
  };

  /**
   * Set a trigger, which is triggered when the timeout occurs in hyper-time.
   * See also getTimeout.
   * @param {Function} callback   Function executed when timeout occurs.
   * @param {Date | number} time  An absolute moment in time (Date) when the
   *                              callback will be triggered. When the date is
   *                              a Date in the past, the callback is triggered
   *                              immediately.
   * @return {number} Returns a triggerId which can be used to cancel the
   *                  trigger using clearTrigger().
   */
  timer.setTrigger = function (callback, time) {
    var id = idSeq++;
    var timestamp = Number(time);
    if (isNaN(timestamp)) {
      throw new TypeError('time must be a Date or number');
    }

    // add a new timeout to the queue
    _queueTimeout({
      id: id,
      type: TYPE.TRIGGER,
      time: timestamp,
      callback: callback
    });

    // reschedule the timeouts
    _schedule();

    return id;
  };


  /**
   * Trigger a callback every interval. Optionally, a start date can be provided
   * to specify the first time the callback must be triggered.
   * See also setTimeout and setTrigger.
   * @param {Function} callback         Function executed when delay is exceeded.
   * @param {number} interval           Interval in milliseconds. When interval
   *                                    is smaller than zero or is infinity, the
   *                                    interval will be set to zero and triggered
   *                                    with a maximum rate.
   * @param {Date | number} [firstTime] An absolute moment in time (Date) when the
   *                                    callback will be triggered the first time.
   *                                    By default, firstTime = now() + interval.
   * @return {number} Returns a intervalId which can be used to cancel the
   *                  trigger using clearInterval().
   */
  timer.setInterval = function(callback, interval, firstTime) {
    var id = idSeq++;

    var _interval = Number(interval);
    if (isNaN(_interval)) {
      throw new TypeError('interval must be a number');
    }
    if (_interval < 0 || !isFinite(_interval)) {
      _interval = 0;
    }

    var timestamp;
    if (firstTime != undefined) {
      timestamp = Number(firstTime);
      if (isNaN(timestamp)) {
        throw new TypeError('firstTime must be a Date or number');
      }
    }
    else {
      // firstTime is undefined or null
      timestamp = (timer.now() + _interval);
    }

    // add a new timeout to the queue
    _queueTimeout({
      id: id,
      type: TYPE.INTERVAL,
      interval: _interval,
      time: timestamp,
      firstTime: timestamp,
      occurrence: 0,
      callback: callback
    });

    // reschedule the timeouts
    _schedule();

    return id;
  };

  /**
   * Cancel a timeout
   * @param {number} timeoutId   The id of a timeout
   */
  timer.clearTimeout = function(timeoutId) {
    // test whether timeout is currently being executed
    if (current[timeoutId]) {
      delete current[timeoutId];
      return;
    }

    // find the timeout in the queue
    for (var i = 0; i < timeouts.length; i++) {
      if (timeouts[i].id === timeoutId) {
        // remove this timeout from the queue
        timeouts.splice(i, 1);

        // reschedule timeouts
        _schedule();
        break;
      }
    }
  };

  /**
   * Cancel a trigger
   * @param {number} triggerId   The id of a trigger
   */
  timer.clearTrigger = timer.clearTimeout;

  timer.clearInterval = timer.clearTimeout;

  /**
   * Returns a list with the id's of all timeouts
   * @returns {number[]} Timeout id's
   */
  timer.list = function () {
    return timeouts.map(function (timeout) {
      return timeout.id;
    });
  };

  /**
   * Clear all timeouts
   */
  timer.clear = function () {
    // empty the queue
    current = {};
    timeouts = [];

    // reschedule
    _schedule();
  };

  /**
   * Add a timeout to the queue. After the queue has been changed, the queue
   * must be rescheduled by executing _reschedule()
   * @param {{id: number, type: number, time: number, callback: Function}} timeout
   * @private
   */
  function _queueTimeout(timeout) {
    // insert the new timeout at the right place in the array, sorted by time
    if (timeouts.length > 0) {
      var i = timeouts.length - 1;
      while (i >= 0 && timeouts[i].time > timeout.time) {
        i--;
      }

      // insert the new timeout in the queue. Note that the timeout is
      // inserted *after* existing timeouts with the exact *same* time,
      // so the order in which they are executed is deterministic
      timeouts.splice(i + 1, 0, timeout);
    }
    else {
      // queue is empty, append the new timeout
      timeouts.push(timeout);
    }
  }

  /**
   * Execute a timeout
   * @param {{id: number, type: number, time: number, callback: function}} timeout
   * @param {function} [callback]
   *             The callback is executed when the timeout's callback is
   *             finished. Called without parameters
   * @private
   */
  function _execTimeout(timeout, callback) {
    // store the timeout in the queue with timeouts in progress
    // it can be cleared when a clearTimeout is executed inside the callback
    current[timeout.id] = timeout;

    function finish() {
      // in case of an interval we have to reschedule on next cycle
      // interval must not be cleared while executing the callback
      if (timeout.type === TYPE.INTERVAL && current[timeout.id]) {
        timeout.occurrence++;
        timeout.time = timeout.firstTime + timeout.occurrence * timeout.interval;
        _queueTimeout(timeout);
      }

      // remove the timeout from the queue with timeouts in progress
      delete current[timeout.id];

      if (typeof callback === 'function') callback();
    }

    // execute the callback
    try {
      if (timeout.callback.length == 0) {
        // synchronous timeout,  like `timer.setTimeout(function () {...}, delay)`
        timeout.callback();
        finish();
      } else {
        // asynchronous timeout, like `timer.setTimeout(function (done) {...; done(); }, delay)`
        timeout.callback(finish);
      }
    } catch (err) {
      // silently ignore errors thrown by the callback
      finish();
    }
  }

  /**
   * Remove all timeouts occurring before or on the provided time from the
   * queue and return them.
   * @param {number} time    A timestamp
   * @returns {Array} returns an array containing all expired timeouts
   * @private
   */
  function _getExpiredTimeouts(time) {
    var i = 0;
    while (i < timeouts.length && ((timeouts[i].time <= time) || !isFinite(timeouts[i].time))) {
      i++;
    }
    var expired = timeouts.splice(0, i);

    if (deterministic == false) {
      // the array with expired timeouts is in deterministic order
      // shuffle them
      util.shuffle(expired);
    }

    return expired;
  }

  /**
   * Reschedule all queued timeouts
   * @private
   */
  function _schedule() {
    // do not _schedule when there are timeouts in progress
    // this can be the case with async timeouts in discrete time.
    // _schedule will be executed again when all async timeouts are finished.
    if (rate === DISCRETE && Object.keys(current).length > 0) {
      return;
    }

    var next = timeouts[0];

    // cancel timer when running
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }

    if (running && next) {
      // schedule next timeout
      var time = next.time;
      var delay = time - timer.now();
      var realDelay = (rate === DISCRETE) ? 0 : delay / rate;

      function onTimeout() {
        // when running in discrete time, update the hyperTime to the time
        // of the current event
        if (rate === DISCRETE) {
          hyperTime = (time > hyperTime && isFinite(time)) ? time : hyperTime;
        }

        // grab all expired timeouts from the queue
        var expired = _getExpiredTimeouts(time);
        // note: expired.length can never be zero (on every change of the queue, we reschedule)

        // execute all expired timeouts
        if (rate === DISCRETE) {
          // in discrete time, we execute all expired timeouts serially,
          // and wait for their completion in order to guarantee deterministic
          // order of execution
          function next() {
            var timeout = expired.shift();
            if (timeout) {
              _execTimeout(timeout, next);
            }
            else {
              // schedule the next round
              _schedule();
            }
          }
          next();
        }
        else {
          // in continuous time, we fire all timeouts in parallel,
          // and don't await their completion (they can do async operations)
          expired.forEach(_execTimeout);

          // schedule the next round
          _schedule();
        }
      }

      timeoutId = setTimeout(onTimeout, Math.round(realDelay));
      // Note: Math.round(realDelay) is to defeat a bug in node.js v0.10.30,
      //       see https://github.com/joyent/node/issues/8065
    }
  }

  Object.defineProperty(timer, 'running', {
    get: function () {
      return running;
    }
  });

  timer.config(options);         // apply options
  timer.setTime(util.systemNow()); // set time as current real time
  timer.continue();              // start the timer

  return timer;
}

module.exports = hypertimer;
