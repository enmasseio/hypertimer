/**
 * Create a new HyperTimer
 * @constructor
 * @param {Object} [options]  The following options are available:
 *                            rate: Number The rate of speed of hyper time with
 *                                         respect to real-time in milliseconds
 *                                         per millisecond. By default, rate
 *                                         is 1. Note that rate can even be a
 *                                         negative number.
 */
function HyperTimer (options) {
  if (!(this instanceof HyperTimer)) {
    throw new SyntaxError('Constructor must be called with the new operator');
  }

  // TODO: make internal properties readonly?

  // options
  this.rate = 1;             // number of milliseconds per milliseconds

  // properties
  this.running = false;   // true when running
  this.realTime = null;   // timestamp. the moment in real-time when hyperTime was set
  this.hyperTime = null;  // timestamp. the start time in hyper-time

  this.config(options);   // apply options
  this.set(nowReal());    // set time as current real time
  this.continue();        // start the timer
}

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
HyperTimer.prototype.config = function(options) {
  if (options) {
    if ('rate' in options) {
      var newRate = Number(options.rate);
      if (isNaN(newRate)) {
        throw new TypeError('Rate must be a number');
      }// TODO: add option rate='discrete'
      this.rate = newRate;
    }
  }

  // return a copy of the configuration options
  return {
    rate: this.rate
  };
};

/**
 * Set the time of the timer. To get the current time, use now() or time().
 * @param {Number | Date} time  The time in hyper-time.
 */
HyperTimer.prototype.set = function (time) {
  if (time instanceof Date) {
    this.hyperTime = time.valueOf();
  }
  else if (typeof time === 'number') {
    this.hyperTime = time;
  }
  else {
    throw new TypeError('Time must be a Date or number');
  }

  // TODO: update running timeouts
};

/**
 * Continue the timer
 */
HyperTimer.prototype.continue = function() {
  this.realTime = nowReal();
  this.running = true;

  // TODO: update running timeouts
};

/**
 * Pause the timer. The timer can be continued again with `continue()`
 */
HyperTimer.prototype.pause = function() {
  this.hyperTime = this.get();
  this.realTime = null;
  this.running = false;

  // TODO: pause should also pause timeouts
};

/**
 * Returns the current time of the timer in hyper-time as a number.
 * See also now().
 * @return {number} The time
 */
HyperTimer.prototype.get = function () {
  if (this.running) {
    // TODO: implement performance.now() / process.hrtime(time) for high precision calculation of time interval
    var realInterval = nowReal() - this.realTime;
    var hyperInterval = realInterval * this.rate;
    return this.hyperTime + hyperInterval;
  }
  else {
    return this.hyperTime;
  }
};

/**
 * Returns the current time of the timer in hyper-time as Date.
 * See also get().
 * @return {Date} The time
 */
HyperTimer.prototype.now = function() {
  return new Date(this.get());
};

/**
 * Get the value of the hypertimer. This function returns the result of now().
 * @return {Date} current time
 */
HyperTimer.prototype.valueOf = HyperTimer.prototype.now;

/**
 * Return a string representation of the current hyper-time.
 * @returns {string} String representation
 */
HyperTimer.prototype.toString = function () {
  return this.now().toString();
};

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
HyperTimer.prototype.setTimeout = function(callback, delay) {
  var realDelay;

  // TODO: register the timeout in an array, return a self made id

  if (typeof delay === 'number') {
    realDelay = delay / this.rate;
    return setTimeout(callback, realDelay);
  }
  else if (delay instanceof Date) {
    var hyperInterval = delay.valueOf() - this.hyperTime;
    realDelay = hyperInterval / this.rate;
    return setTimeout(callback, realDelay);
  }
  else {
    throw new TypeError('Delay must be a number or Date');
  }
};

/**
 * Cancel a timeout
 * @param {number} timeoutId   The id of a timeout
 */
HyperTimer.prototype.clearTimeout = function(timeoutId) {
  clearTimeout(timeoutId);
};

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
HyperTimer.prototype.setTrigger = function (callback, date) {
  // TODO: implement setTrigger
};

/**
 * Cancel a trigger
 * @param {number} triggerId   The id of a trigger
 */
HyperTimer.prototype.clearTrigger = function(triggerId) {
  // TODO: implement clearTrigger
};

/*
 HyperTimer.prototype.setInterval = function(callback, interval) {
 // TODO: implement setInterval
 };

 HyperTimer.prototype.clearInterval = function(intervalId) {
 // TODO: implement clearInterval
 };
 */

module.exports = HyperTimer;
