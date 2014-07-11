/**
 * Create a hypertimer
 * @param {Object} [options]  The following options are available:
 *                            rate: Number The rate of speed of hyper time with
 *                                         respect to real-time in milliseconds
 *                                         per millisecond. By default, rate
 *                                         is 1. Note that rate can even be a
 *                                         negative number.
 */
module.exports = function hypertimer (options) {
  // options
  var rate = 1;             // number of milliseconds per milliseconds
  //var mode = 'continuous';  // 'discrete' or 'continuous' (default)

  // properties
  var running = false;   // true when running
  var realTime = null;   // timestamp. the moment in real-time when hyperTime was set
  var hyperTime = null;  // timestamp. the start time in hyper-time

  /**
   * Helper function to get the current time
   * @return {number} Current time
   */
  var _now;
  if (typeof Date.now === 'function') {
    _now = function () {
      return Date.now();
    }
  }
  else {
    _now = function () {
      return new Date().valueOf();
    }
  }

  // TODO: implement performance.now() / process.hrtime(time) for high precision calculation of time interval

  /**
   * Change configuration options of the hypertimer, or retrieve current
   * configuration.
   * @param {Object} [options]  The following options are available:
   *                            rate: Number The rate of speed of hyper time with
   *                                         respect to real-time in milliseconds
   *                                         per millisecond. By default, rate
   *                                         is 1. Note that rate can even be a
   *                                         negative number.
   * @return {Object} Returns the applied configuration
   */
  function config(options) {
    if (options) {
      if ('rate' in options) {
        var newRate = Number(options.rate);
        if (isNaN(newRate)) {
          throw new TypeError('Invalid rate, number expected');
        }
        rate = newRate;
      }
      /* TODO: implement option mode
      if ('mode' in options) {
        if (options.mode != 'continuous') {
          throw new Error('Unknown mode "'+ options.mode +'"');
        }
        mode = options.mode;
      }
      */
    }

    // return a copy of the configuration options
    return {
      rate: rate
      //mode: mode
    };
  }

  /**
   * Start the timer
   * @param {Number | Date} time  The start time in hyper-time.
   */
  function start(time) {
    if (time instanceof Date) {
      hyperTime = time.valueOf();
    }
    else if (typeof time === 'number') {
      hyperTime = time;
    }
    else {
      throw new TypeError('Date or number expected');
    }
    realTime = _now();
    running = true;
  }

  /**
   * Continue the timer
   */
  function _continue() {
    realTime = _now();
    running = true;
  }

  /**
   * Pause the timer. The timer can be continued again with `start()`
   */
  function pause() {
    hyperTime = time();
    realTime = null;
    running = false;
  }

  /**
   * Returns the current time of the timer in hyper-time as a number.
   * See also now().
   * @return {number} The time
   */
  function time() {
    if (running) {
      // TODO: implement performance.now() / process.hrtime(time) for high precision calculation of time interval
      var realInterval = _now() - realTime;
      var hyperInterval = realInterval * rate;
      return hyperTime + hyperInterval;
    }
    else {
      return hyperTime;
    }
  }

  /**
   * Returns the current time of the timer in hyper-time as Date.
   * See also time().
   * @return {Date} The time
   */
  function now() {
    return new Date(time());
  }

  // apply options
  config(options);

  // start the timer at current real-time
  start(_now());

  // export public functions
  return {
    config: config,
    start: start,
    continue: _continue,
    pause: pause,

    /**
     * Test whether the hypertimer is running
     * @returns {boolean} Returns true when running, and false when paused
     */
    running: function () {
      return running;
    },

    time: time,
    now: now,

    /**
     * Get the value of the hypertimer. This function returns the result of now().
     * @return {Date} current time
     */
    valueOf: now,

    /**
     * Return a string representation of the current hyper-time,
     * an ISO date string.
     * @returns {string} String representation
     */
    toString: function () {
      return now().toISOString();
    }

    /*
    setTimeout: function(callback, delay) {
      // TODO: implement setTimeout
    },

    clearTimeout: function(timeoutId) {
      clearTimeout(timeoutId);
    },

    setInterval: function(callback, interval) {
      // TODO: implement setInterval
    },

    clearInterval: function(intervalId) {
      clearInterval(intervalId);
    }
    */
  };
};
