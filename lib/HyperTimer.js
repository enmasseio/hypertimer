var util = require('./util');

// enum for type of timeout
var TYPE = {
  TIMEOUT: 0,
  INTERVAL: 1,
  TRIGGER: 2
};

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
// TODO: rewrite to a regular factory function again?
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

  this.timeouts = [];     // array with all running timeouts
  this.timeout = null;    // currently running timer

  // override all functions with a version bounded to this HyperTimer instance,
  // so that the functions can be used safely from a different context.
  for (var prop in HyperTimer.prototype) {
    if (HyperTimer.prototype.hasOwnProperty(prop) && typeof HyperTimer.prototype[prop] === 'function') {
      this[prop] = HyperTimer.prototype[prop].bind(this);
    }
  }

  this.config(options);         // apply options
  this.setTime(util.nowReal()); // set time as current real time
  this.continue();              // start the timer
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
        throw new TypeError('rate must be a number');
      }
      // TODO: add option rate='discrete'
      this.hyperTime = this.now();
      this.realTime = util.nowReal();
      this.rate = newRate;
    }
  }

  // reschedule running timeouts
  this._schedule();

  // return a copy of the configuration options
  return {
    rate: this.rate
  };
};

/**
 * Set the time of the timer. To get the current time, use getTime() or now().
 * @param {Number | Date} time  The time in hyper-time.
 */
HyperTimer.prototype.setTime = function (time) {
  if (time instanceof Date) {
    this.hyperTime = time.valueOf();
  }
  else {
    var newTime = Number(time);
    if (isNaN(newTime)) {
      throw new TypeError('time must be a Date or number');
    }
    this.hyperTime = newTime;
  }

  // reschedule running timeouts
  this._schedule();
};

/**
 * Returns the current time of the timer in hyper-time as a number.
 * See also getTime().
 * @return {number} The time
 */
HyperTimer.prototype.now = function () {
  if (this.running) {
    // TODO: implement performance.now() / process.hrtime(time) for high precision calculation of time interval
    var realInterval = util.nowReal() - this.realTime;
    var hyperInterval = realInterval * this.rate;
    return this.hyperTime + hyperInterval;
  }
  else {
    return this.hyperTime;
  }
};

/**
 * Continue the timer.
 */
HyperTimer.prototype.continue = function() {
  this.realTime = util.nowReal();
  this.running = true;

  // reschedule running timeouts
  this._schedule();
};

/**
 * Pause the timer. The timer can be continued again with `continue()`
 */
HyperTimer.prototype.pause = function() {
  this.hyperTime = this.now();
  this.realTime = null;
  this.running = false;

  // reschedule running timeouts (pauses them)
  this._schedule();
};

/**
 * Returns the current time of the timer in hyper-time as Date.
 * See also now().
 * @return {Date} The time
 */
// rename to getTime
HyperTimer.prototype.getTime = function() {
  return new Date(this.now());
};

/**
 * Get the value of the hypertimer. This function returns the result of getTime().
 * @return {Date} current time
 */
HyperTimer.prototype.valueOf = HyperTimer.prototype.getTime;

/**
 * Return a string representation of the current hyper-time.
 * @returns {string} String representation
 */
HyperTimer.prototype.toString = function () {
  return this.getTime().toString();
};

/**
 * Add a timeout to the queue. After the queue has been changed, the queue
 * must be rescheduled by executing _reschedule()
 * @param {{type: number, time: number, callback: Function}} params
 */
HyperTimer.prototype._queueTimeout = function(params) {
  // insert the new timeout at the right place in the array, sorted by time
  if (this.timeouts.length > 0) {
    var i = this.timeouts.length - 1;
    while (i >= 0 && this.timeouts[i].time > params.time) {
      i--;
    }

    // insert the new timeout in the queue. Note that the timeout is
    // inserted *after* existing timeouts with the exact *same* time,
    // so the order in which they are executed is deterministic
    this.timeouts.splice(i + 1, 0, params);
  }
  else {
    // queue is empty, append the new timeout
    this.timeouts.push(params);
  }
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
  var id = idSeq++;
  var timestamp = this.now() + delay;
  if (isNaN(timestamp)) {
    throw new TypeError('delay must be a number');
  }

  // add a new timeout to the queue
  this._queueTimeout({
    id: id,
    type: TYPE.TIMEOUT,
    time: timestamp,
    callback: callback
  });

  // reschedule the timeouts
  this._schedule();

  return id;
};

/**
 * Set a trigger, which is triggered after a delay is expired in hyper-time.
 * See also getTimeout.
 * @param {Function} callback   Function executed when delay is exceeded.
 * @param {Date | number} time  An absolute moment in time (Date) when the
 *                              callback will be triggered. When the rate is
 *                              zero, or the date is a Date in the past,
 *                              the callback is triggered immediately.
 * @return {number} Returns a triggerId which can be used to cancel the
 *                  trigger using clearTrigger().
 */
HyperTimer.prototype.setTrigger = function (callback, time) {
  var id = idSeq++;
  var timestamp = Number(time);
  if (isNaN(timestamp)) {
    throw new TypeError('time must be a Date or number');
  }

  // add a new timeout to the queue
  this._queueTimeout({
    id: id,
    type: TYPE.TRIGGER,
    time: timestamp,
    callback: callback
  });

  // reschedule the timeouts
  this._schedule();

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
 *                                    By default, start = now() + interval.
 * @return {number} Returns a intervalId which can be used to cancel the
 *                  trigger using clearInterval().
 */
HyperTimer.prototype.setInterval = function(callback, interval, firstTime) {
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
    timestamp = (this.now() + _interval);
  }

  // add a new timeout to the queue
  this._queueTimeout({
    id: id,
    type: TYPE.INTERVAL,
    time: timestamp,
    firstTime: timestamp,
    interval: _interval,
    occurrence: 0,
    callback: callback
  });

  // reschedule the timeouts
  this._schedule();

  return id;
};

/**
 * Reschedule all queued timeouts
 * @private
 */
HyperTimer.prototype._schedule = function() {
  var me = this;
  var timeout;
  var next = this.timeouts[0];

  // cancel timer when running
  if (this.timeout) {
    clearTimeout(this.timeout);
    this.timeout = null;
  }

  if (this.running && next) {
    // schedule next timeout
    var time = next.time;
    var delay = time - this.now();
    var realDelay = delay / this.rate;

    function trigger() {
      // clear reference to this trigger
      me.timeout = null;

      // execute all expired timeouts
      var intervals = [];
      while (me.timeouts.length > 0  &&
          ((me.timeouts[0].time <= time) || !isFinite(me.timeouts[0].time))) {
        timeout = me.timeouts[0];

        // execute the callback
        try {
          timeout.callback();
        } catch (err) {
          // silently ignore errors thrown by the callback
        }

        // in case of an interval we have to reschedule on next cycle
        if (timeout.type === TYPE.INTERVAL) {
          if (me.timeouts[0] === timeout) {
            // timeout is not removed inside the callback, reschedule it
            me.timeouts.shift();
            intervals.push(timeout);
          }
        }
        else {
          me.timeouts.shift();
        }
      }

      // reschedule intervals
      for (var i = 0; i < intervals.length; i++) {
        timeout = intervals[i];
        timeout.occurrence++;
        timeout.time = timeout.firstTime + timeout.interval * timeout.occurrence;
        me._queueTimeout(timeout);
      }

      // initialize next round of timeouts
      me._schedule();
    }

    this.timeout = setTimeout(trigger, realDelay);
  }
};

/**
 * Cancel a timeout
 * @param {number} timeoutId   The id of a timeout
 */
HyperTimer.prototype.clearTimeout = function(timeoutId) {
  // find the timeout in the queue
  for (var i = 0; i < this.timeouts.length; i++) {
    if (this.timeouts[i].id === timeoutId) {
      // remove this timeout from the queue
      this.timeouts.splice(i, 1);

      // reschedule timeouts
      this._schedule();
      break;
    }
  }
};

/**
 * Cancel a trigger
 * @param {number} triggerId   The id of a trigger
 */
HyperTimer.prototype.clearTrigger = HyperTimer.prototype.clearTimeout;

HyperTimer.prototype.clearInterval = HyperTimer.prototype.clearTimeout;

// TODO: implement a function clear to clear all timeouts?

// counter for unique timeout id's
var idSeq = 0;

module.exports = HyperTimer;
