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

  // properties
  var running = false;   // true when running
  var realTime = null;   // timestamp. the moment in real-time when hyperTime was set
  var hyperTime = null;  // timestamp. the start time in hyper-time

  /**
   * Helper function to get the current time
   * @return {number} Current time
   */
  var nowReal;
  if (typeof Date.now === 'function') {
    nowReal = function () {
      return Date.now();
    }
  }
  else {
    nowReal = function () {
      return new Date().valueOf();
    }
  }

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
          throw new TypeError('Rate must be a number');
        }
        // TODO: add option rate='discrete'
        rate = newRate;
      }
    }

    // return a copy of the configuration options
    return {
      rate: rate
    };
  }

  /**
   * Set the time of the timer. To get the current time, use now() or time().
   * @param {Number | Date} time  The time in hyper-time.
   */
  function set(time) {
    if (time instanceof Date) {
      hyperTime = time.valueOf();
    }
    else if (typeof time === 'number') {
      hyperTime = time;
    }
    else {
      throw new TypeError('Time must be a Date or number');
    }

    // TODO: update running timeouts
  }

  /**
   * Continue the timer
   */
  function _continue() {
    realTime = nowReal();
    running = true;

    // TODO: update running timeouts
  }

  /**
   * Pause the timer. The timer can be continued again with `continue()`
   */
  function _pause() {
    hyperTime = time();
    realTime = null;
    running = false;

    // TODO: pause should also pause timeouts
  }

  /**
   * Returns the current time of the timer in hyper-time as a number.
   * See also now().
   * @return {number} The time
   */
  function time() {
    if (running) {
      // TODO: implement performance.now() / process.hrtime(time) for high precision calculation of time interval
      var realInterval = nowReal() - realTime;
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
  set(nowReal());
  _continue();

  // export public functions
  return {
    config: config,
    set: set,
    continue: _continue,
    pause: _pause,

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
     * Return a string representation of the current hyper-time.
     * @returns {string} String representation
     */
    toString: function () {
      return now().toString();
    },

    /**
     * Set a timeout, which is triggered after a delay is expired in hyper-time.
     * See also setTrigger.
     * @param {Function} callback   Function executed when delay is exceeded.
     * @param {number} delay        The delay in milliseconds. When the rate is
     *                              zero, or the delay is smaller or equal to
     *                              zero, the callback is triggered immediately.
     * @return {number} Returns a timeoutId which can be used to cancel the
     *                  timeout using clearTimeout().
     */
    setTimeout: function(callback, delay) {
      var realDelay;

      // TODO: register the timeout in an array, return a self made id

      if (typeof delay === 'number') {
        realDelay = delay / rate;
        return setTimeout(callback, realDelay);
      }
      else if (delay instanceof Date) {
        var hyperInterval = delay.valueOf() - hyperTime;
        realDelay = hyperInterval / rate;
        return setTimeout(callback, realDelay);
      }
      else {
        throw new TypeError('Delay must be a number or Date');
      }
    },

    /**
     * Cancel a timeout
     * @param {number} timeoutId   The id of a timeout
     */
    clearTimeout: function(timeoutId) {
      clearTimeout(timeoutId);
    },

    /**
     * Set a trigger, which is triggered after a delay is expired in hyper-time.
     * See also getTimeout.
     * @param {Function} callback   Function executed when delay is exceeded.
     * @param {Date} date           An absolute moment in time (Date) when the
     *                              callback will be triggered. When the rate is
     *                              zero, or the date is a Date in the past,
     *                              the callback is triggered immediately.
     * @return {number} Returns a triggerId which can be used to cancel the
     *                  trigger using clearTrigger().
     */
    setTrigger: function (callback, date) {
      // TODO: implement setTrigger
    },

    /**
     * Cancel a trigger
     * @param {number} triggerId   The id of a trigger
     */
    clearTrigger: function(triggerId) {
      // TODO: implement clearTrigger
    }

    /*
    setInterval: function(callback, interval) {
      // TODO: implement setInterval
    },

    clearInterval: function(intervalId) {
      clearInterval(intervalId);
    }
    */
  };
};
