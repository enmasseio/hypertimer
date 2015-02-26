/**
 * hypertimer.js
 * https://github.com/enmasseio/hypertimer
 *
 * Time control for simulations.
 *
 * Run a timer at a faster or slower pace than real-time, or run discrete events.
 *
 * @version 2.0.1
 * @date    2015-02-26
 *
 * @license
 * Copyright (C) 2014-2015 Almende B.V., http://almende.com
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy
 * of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory(require("ws"));
	else if(typeof define === 'function' && define.amd)
		define(["ws"], factory);
	else if(typeof exports === 'object')
		exports["hypertimer"] = factory(require("ws"));
	else
		root["hypertimer"] = factory(root["ws"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_21__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;
/******/
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";

  module.exports = __webpack_require__(1);

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";

  var emitter = __webpack_require__(2);
  var hasListeners = __webpack_require__(17);
  var createMaster = __webpack_require__(19).createMaster;
  var createSlave = __webpack_require__(33).createSlave;
  var util = __webpack_require__(34);

  // enum for type of timeout
  var TYPE = {
    TIMEOUT: 0,
    INTERVAL: 1,
    TRIGGER: 2
  };

  /**
   * Create a new hypertimer
   * @param {Object} [options]  The following options are available:
   *                            deterministic: boolean
   *                                        If true (default), simultaneous events
   *                                        are executed in a deterministic order.
   *                            paced: boolean
   *                                        Mode for pacing of time. When paced,
   *                                        the time proceeds at a continuous,
   *                                        configurable rate, useful for
   *                                        animation purposes. When unpaced, the
   *                                        time jumps immediately from scheduled
   *                                        event to the next scheduled event.
   *                            rate: number
   *                                        The rate of progress of time with
   *                                        respect to real-time. Rate must be a
   *                                        positive number, and is 1 by default.
   *                                        For example when 2, the time of the
   *                                        hypertimer runs twice as fast as
   *                                        real-time.
   *                                        Only applicable when option paced=true.
   *                            time: number | Date | String
   *                                        Set a simulation time. If not provided,
   *                                        The timer is instantiated with the
   *                                        current system time.
   */
  function hypertimer(options) {
    // options
    var paced = true;
    var rate = 1; // number of milliseconds per milliseconds
    var deterministic = true; // run simultaneous events in a deterministic order
    var configuredTime = null; // only used for returning the configured time on .config()
    var master = null;
    var slave = null;

    // properties
    var running = false; // true when running
    var startTime = null; // timestamp. the moment in real-time when hyperTime was set
    var hyperTime = util.systemNow(); // timestamp. the start time in hyper-time
    var timeouts = []; // array with all running timeouts
    var current = {}; // the timeouts currently in progress (callback is being executed)
    var timeoutId = null; // currently running timer
    var idSeq = 0; // counter for unique timeout id's

    // exported timer object with public functions and variables
    // add event-emitter mixin
    var timer = emitter({});

    /**
     * Change configuration options of the hypertimer, or retrieve current
     * configuration.
     * @param {Object} [options]  The following options are available:
     *                            deterministic: boolean
     *                                        If true (default), simultaneous events
     *                                        are executed in a deterministic order.
     *                            paced: boolean
     *                                        Mode for pacing of time. When paced,
     *                                        the time proceeds at a continuous,
     *                                        configurable rate, useful for
     *                                        animation purposes. When unpaced, the
     *                                        time jumps immediately from scheduled
     *                                        event to the next scheduled event.
     *                            rate: number
     *                                        The rate of progress of time with
     *                                        respect to real-time. Rate must be a
     *                                        positive number, and is 1 by default.
     *                                        For example when 2, the time of the
     *                                        hypertimer runs twice as fast as
     *                                        real-time.
     *                                        Only applicable when option paced=true.
     *                            time: number | Date | String
     *                                        Set a simulation time.
     * @return {Object} Returns the applied configuration
     */
    timer.config = function (options) {
      if (options) {
        _setConfig(options);
      }

      // return a copy of the configuration options
      return _getConfig();
    };

    /**
     * Returns the current time of the timer as a number.
     * See also getTime().
     * @return {number} The time
     */
    timer.now = function () {
      if (paced) {
        if (running) {
          // TODO: implement performance.now() / process.hrtime(time) for high precision calculation of time interval
          var realInterval = util.systemNow() - startTime;
          var hyperInterval = realInterval * rate;
          return hyperTime + hyperInterval;
        } else {
          return hyperTime;
        }
      } else {
        return hyperTime;
      }
    };

    /**
     * Continue the timer.
     */
    timer["continue"] = function () {
      startTime = util.systemNow();
      running = true;

      // reschedule running timeouts
      _schedule();
    };

    /**
     * Pause the timer. The timer can be continued again with `continue()`
     */
    timer.pause = function () {
      hyperTime = timer.now();
      startTime = null;
      running = false;

      // reschedule running timeouts (pauses them)
      _schedule();
    };

    /**
     * Returns the current time of the timer as Date.
     * See also now().
     * @return {Date} The time
     */
    timer.getTime = function () {
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
    timer.setTimeout = function (callback, delay) {
      var id = idSeq++;
      var timestamp = timer.now() + delay;
      if (isNaN(timestamp)) {
        throw new TypeError("delay must be a number");
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
     * @param {Date | number | string } time
     *                              An absolute moment in time (Date) when the
     *                              callback will be triggered. When the date is
     *                              a Date in the past, the callback is triggered
     *                              immediately.
     * @return {number} Returns a triggerId which can be used to cancel the
     *                  trigger using clearTrigger().
     */
    timer.setTrigger = function (callback, time) {
      var id = idSeq++;
      var timestamp = toTimestamp(time);

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
     * @param {Date | number | string} [firstTime]
     *                                    An absolute moment in time (Date) when the
     *                                    callback will be triggered the first time.
     *                                    By default, firstTime = now() + interval.
     * @return {number} Returns a intervalId which can be used to cancel the
     *                  trigger using clearInterval().
     */
    timer.setInterval = function (callback, interval, firstTime) {
      var id = idSeq++;

      var _interval = Number(interval);
      if (isNaN(_interval)) {
        throw new TypeError("interval must be a number");
      }
      if (_interval < 0 || !isFinite(_interval)) {
        _interval = 0;
      }

      var _firstTime = firstTime != undefined ? toTimestamp(firstTime) : null;

      var now = timer.now();
      var _time = _firstTime != null ? _firstTime : now + _interval;

      var timeout = {
        id: id,
        type: TYPE.INTERVAL,
        interval: _interval,
        time: _time,
        firstTime: _firstTime != null ? _firstTime : _time,
        occurrence: 0,
        callback: callback
      };

      if (_time < now) {
        // update schedule when in the past
        _rescheduleInterval(timeout, now);
      }

      // add a new timeout to the queue
      _queueTimeout(timeout);

      // reschedule the timeouts
      _schedule();

      return id;
    };

    /**
     * Cancel a timeout
     * @param {number} timeoutId   The id of a timeout
     */
    timer.clearTimeout = function (timeoutId) {
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
     * Get the current configuration
     * @returns {{paced: boolean, rate: number, deterministic: boolean, time: *, master: *}}
     *                Returns a copy of the current configuration
     * @private
     */
    function _getConfig() {
      return {
        paced: paced,
        rate: rate,
        deterministic: deterministic,
        time: configuredTime,
        master: master
      };
    }

    /**
     * Change configuration
     * @param {{paced: boolean, rate: number, deterministic: boolean, time: *, master: *}} options
     * @private
     */
    function _setConfig(options) {
      if ("deterministic" in options) {
        deterministic = options.deterministic ? true : false;
      }

      if ("paced" in options) {
        paced = options.paced ? true : false;
      }

      // important: apply time before rate
      if ("time" in options) {
        hyperTime = toTimestamp(options.time);
        startTime = util.systemNow();

        // update intervals
        _rescheduleIntervals(hyperTime);

        configuredTime = new Date(hyperTime).toISOString();
      }

      if ("rate" in options) {
        var newRate = Number(options.rate);
        if (isNaN(newRate) || newRate <= 0) {
          throw new TypeError("Invalid rate " + JSON.stringify(options.rate) + ". Rate must be a positive number");
        }

        // important: first get the new hyperTime, then adjust the startTime
        hyperTime = timer.now();
        startTime = util.systemNow();
        rate = newRate;
      }

      if ("master" in options) {
        var url;
        var timesyncOptions;

        (function () {
          var applyConfig = function (config) {
            var prev = _getConfig();
            _setConfig(config);
            var curr = _getConfig();
            timer.emit("config", curr, prev);
          };

          timesyncOptions = {};

          if (typeof options.master === "string") {
            url = options.master;
          } else {
            url = options.master.url;
            for (prop in options.master) {
              if (options.master.hasOwnProperty(prop) && prop !== "url") {
                timesyncOptions[prop] = options.master.prop;
              }
            }
          }

          // create a timesync slave, connect to master via a websocket
          if (slave) {
            slave.destroy();
          }
          slave = createSlave(url);

          slave.on("change", function (time) {
            return applyConfig({ time: time });
          });
          slave.on("config", function (config) {
            return applyConfig(config);
          });
          slave.on("error", function (err) {
            return timer.emit("error", err);
          });
        })();
      }

      if ("port" in options) {
        // create a master
        // TODO: destroy when already existing
        master = createMaster(timer.now, timer.config, options.port);
      }

      // reschedule running timeouts
      _schedule();

      if (master) {
        // broadcast changed config
        master.broadcastConfig();
      }
    }

    /**
     * Reschedule all intervals after a new time has been set.
     * @param {number} now
     * @private
     */
    function _rescheduleIntervals(now) {
      for (var i = 0; i < timeouts.length; i++) {
        var timeout = timeouts[i];
        if (timeout.type === TYPE.INTERVAL) {
          _rescheduleInterval(timeout, now);
        }
      }
    }

    /**
     * Reschedule the intervals after a new time has been set.
     * @param {Object} timeout
     * @param {number} now
     * @private
     */
    function _rescheduleInterval(timeout, now) {
      timeout.occurrence = Math.ceil((now - timeout.firstTime) / timeout.interval);
      timeout.time = timeout.firstTime + timeout.occurrence * timeout.interval;
    }

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
      } else {
        // queue is empty, append the new timeout
        timeouts.push(timeout);
      }
    }

    /**
     * Execute a timeout
     * @param {{id: number, type: number, time: number, callback: function}} timeout
     * @param {function} callback
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
          //console.log('queue timeout', timer.getTime().toISOString(), new Date(timeout.time).toISOString(), timeout.occurrence) // TODO: cleanup
        }

        // remove the timeout from the queue with timeouts in progress
        delete current[timeout.id];

        callback && callback();
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
        // emit or log the error
        if (hasListeners(timer, "error")) {
          timer.emit("error", err);
        } else {
          console.log("Error", err);
        }

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
      while (i < timeouts.length && (timeouts[i].time <= time || !isFinite(timeouts[i].time))) {
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
      // this can be the case with async timeouts in non-paced mode.
      // _schedule will be executed again when all async timeouts are finished.
      if (!paced && Object.keys(current).length > 0) {
        return;
      }

      var next = timeouts[0];

      // cancel timer when running
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }

      if (running && next) {
        var onTimeout = function () {
          // when running in non-paced mode, update the hyperTime to
          // adjust the time of the current event
          if (!paced) {
            hyperTime = time > hyperTime && isFinite(time) ? time : hyperTime;
          }

          // grab all expired timeouts from the queue
          var expired = _getExpiredTimeouts(time);
          // note: expired.length can never be zero (on every change of the queue, we reschedule)

          // execute all expired timeouts
          if (paced) {
            // in paced mode, we fire all timeouts in parallel,
            // and don't await their completion (they can do async operations)
            expired.forEach(_execTimeout);

            // schedule the next round
            _schedule();
          } else {
            (function () {
              var next =
              // in non-paced mode, we execute all expired timeouts serially,
              // and wait for their completion in order to guarantee deterministic
              // order of execution
              function () {
                var timeout = expired.shift();
                if (timeout) {
                  _execTimeout(timeout, next);
                } else {
                  // schedule the next round
                  _schedule();
                }
              };

              next();
            })();
          }
        };

        // schedule next timeout
        var time = next.time;
        var delay = time - timer.now();
        var realDelay = paced ? delay / rate : 0;

        timeoutId = setTimeout(onTimeout, Math.round(realDelay));
        // Note: Math.round(realDelay) is to defeat a bug in node.js v0.10.30,
        //       see https://github.com/joyent/node/issues/8065
      }
    }

    /**
     * Convert a Date, number, or ISOString to a number timestamp,
     * and validate whether it's a valid Date. The number Infinity is also
     * accepted as a valid timestamp
     * @param {Date | number | string} date
     * @return {number} Returns a unix timestamp, a number
     */
    function toTimestamp(date) {
      var value = typeof date === "number" ? date : // number
      date instanceof Date ? date.valueOf() : // Date
      new Date(date).valueOf(); // ISOString, momentjs, ...

      if (isNaN(value)) {
        throw new TypeError("Invalid date " + JSON.stringify(date) + ". " + "Date, number, or ISOString expected");
      }

      return value;
    }

    Object.defineProperty(timer, "running", {
      get: function get() {
        return running;
      }
    });

    timer.config(options); // apply options
    timer["continue"](); // start the timer

    return timer;
  }

  module.exports = hypertimer;

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var d        = __webpack_require__(3)
    , callable = __webpack_require__(16)

    , apply = Function.prototype.apply, call = Function.prototype.call
    , create = Object.create, defineProperty = Object.defineProperty
    , defineProperties = Object.defineProperties
    , hasOwnProperty = Object.prototype.hasOwnProperty
    , descriptor = { configurable: true, enumerable: false, writable: true }

    , on, once, off, emit, methods, descriptors, base;

  on = function (type, listener) {
  	var data;

  	callable(listener);

  	if (!hasOwnProperty.call(this, '__ee__')) {
  		data = descriptor.value = create(null);
  		defineProperty(this, '__ee__', descriptor);
  		descriptor.value = null;
  	} else {
  		data = this.__ee__;
  	}
  	if (!data[type]) data[type] = listener;
  	else if (typeof data[type] === 'object') data[type].push(listener);
  	else data[type] = [data[type], listener];

  	return this;
  };

  once = function (type, listener) {
  	var once, self;

  	callable(listener);
  	self = this;
  	on.call(this, type, once = function () {
  		off.call(self, type, once);
  		apply.call(listener, this, arguments);
  	});

  	once.__eeOnceListener__ = listener;
  	return this;
  };

  off = function (type, listener) {
  	var data, listeners, candidate, i;

  	callable(listener);

  	if (!hasOwnProperty.call(this, '__ee__')) return this;
  	data = this.__ee__;
  	if (!data[type]) return this;
  	listeners = data[type];

  	if (typeof listeners === 'object') {
  		for (i = 0; (candidate = listeners[i]); ++i) {
  			if ((candidate === listener) ||
  					(candidate.__eeOnceListener__ === listener)) {
  				if (listeners.length === 2) data[type] = listeners[i ? 0 : 1];
  				else listeners.splice(i, 1);
  			}
  		}
  	} else {
  		if ((listeners === listener) ||
  				(listeners.__eeOnceListener__ === listener)) {
  			delete data[type];
  		}
  	}

  	return this;
  };

  emit = function (type) {
  	var i, l, listener, listeners, args;

  	if (!hasOwnProperty.call(this, '__ee__')) return;
  	listeners = this.__ee__[type];
  	if (!listeners) return;

  	if (typeof listeners === 'object') {
  		l = arguments.length;
  		args = new Array(l - 1);
  		for (i = 1; i < l; ++i) args[i - 1] = arguments[i];

  		listeners = listeners.slice();
  		for (i = 0; (listener = listeners[i]); ++i) {
  			apply.call(listener, this, args);
  		}
  	} else {
  		switch (arguments.length) {
  		case 1:
  			call.call(listeners, this);
  			break;
  		case 2:
  			call.call(listeners, this, arguments[1]);
  			break;
  		case 3:
  			call.call(listeners, this, arguments[1], arguments[2]);
  			break;
  		default:
  			l = arguments.length;
  			args = new Array(l - 1);
  			for (i = 1; i < l; ++i) {
  				args[i - 1] = arguments[i];
  			}
  			apply.call(listeners, this, args);
  		}
  	}
  };

  methods = {
  	on: on,
  	once: once,
  	off: off,
  	emit: emit
  };

  descriptors = {
  	on: d(on),
  	once: d(once),
  	off: d(off),
  	emit: d(emit)
  };

  base = defineProperties({}, descriptors);

  module.exports = exports = function (o) {
  	return (o == null) ? create(base) : defineProperties(Object(o), descriptors);
  };
  exports.methods = methods;


/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var assign        = __webpack_require__(4)
    , normalizeOpts = __webpack_require__(11)
    , isCallable    = __webpack_require__(12)
    , contains      = __webpack_require__(13)

    , d;

  d = module.exports = function (dscr, value/*, options*/) {
  	var c, e, w, options, desc;
  	if ((arguments.length < 2) || (typeof dscr !== 'string')) {
  		options = value;
  		value = dscr;
  		dscr = null;
  	} else {
  		options = arguments[2];
  	}
  	if (dscr == null) {
  		c = w = true;
  		e = false;
  	} else {
  		c = contains.call(dscr, 'c');
  		e = contains.call(dscr, 'e');
  		w = contains.call(dscr, 'w');
  	}

  	desc = { value: value, configurable: c, enumerable: e, writable: w };
  	return !options ? desc : assign(normalizeOpts(options), desc);
  };

  d.gs = function (dscr, get, set/*, options*/) {
  	var c, e, options, desc;
  	if (typeof dscr !== 'string') {
  		options = set;
  		set = get;
  		get = dscr;
  		dscr = null;
  	} else {
  		options = arguments[3];
  	}
  	if (get == null) {
  		get = undefined;
  	} else if (!isCallable(get)) {
  		options = get;
  		get = set = undefined;
  	} else if (set == null) {
  		set = undefined;
  	} else if (!isCallable(set)) {
  		options = set;
  		set = undefined;
  	}
  	if (dscr == null) {
  		c = true;
  		e = false;
  	} else {
  		c = contains.call(dscr, 'c');
  		e = contains.call(dscr, 'e');
  	}

  	desc = { get: get, set: set, configurable: c, enumerable: e };
  	return !options ? desc : assign(normalizeOpts(options), desc);
  };


/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  module.exports = __webpack_require__(5)()
  	? Object.assign
  	: __webpack_require__(6);


/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  module.exports = function () {
  	var assign = Object.assign, obj;
  	if (typeof assign !== 'function') return false;
  	obj = { foo: 'raz' };
  	assign(obj, { bar: 'dwa' }, { trzy: 'trzy' });
  	return (obj.foo + obj.bar + obj.trzy) === 'razdwatrzy';
  };


/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var keys  = __webpack_require__(7)
    , value = __webpack_require__(10)

    , max = Math.max;

  module.exports = function (dest, src/*, …srcn*/) {
  	var error, i, l = max(arguments.length, 2), assign;
  	dest = Object(value(dest));
  	assign = function (key) {
  		try { dest[key] = src[key]; } catch (e) {
  			if (!error) error = e;
  		}
  	};
  	for (i = 1; i < l; ++i) {
  		src = arguments[i];
  		keys(src).forEach(assign);
  	}
  	if (error !== undefined) throw error;
  	return dest;
  };


/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  module.exports = __webpack_require__(8)()
  	? Object.keys
  	: __webpack_require__(9);


/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  module.exports = function () {
  	try {
  		Object.keys('primitive');
  		return true;
  	} catch (e) { return false; }
  };


/***/ },
/* 9 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var keys = Object.keys;

  module.exports = function (object) {
  	return keys(object == null ? object : Object(object));
  };


/***/ },
/* 10 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  module.exports = function (value) {
  	if (value == null) throw new TypeError("Cannot use null or undefined");
  	return value;
  };


/***/ },
/* 11 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var forEach = Array.prototype.forEach, create = Object.create;

  var process = function (src, obj) {
  	var key;
  	for (key in src) obj[key] = src[key];
  };

  module.exports = function (options/*, …options*/) {
  	var result = create(null);
  	forEach.call(arguments, function (options) {
  		if (options == null) return;
  		process(Object(options), result);
  	});
  	return result;
  };


/***/ },
/* 12 */
/***/ function(module, exports, __webpack_require__) {

  // Deprecated

  'use strict';

  module.exports = function (obj) { return typeof obj === 'function'; };


/***/ },
/* 13 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  module.exports = __webpack_require__(14)()
  	? String.prototype.contains
  	: __webpack_require__(15);


/***/ },
/* 14 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var str = 'razdwatrzy';

  module.exports = function () {
  	if (typeof str.contains !== 'function') return false;
  	return ((str.contains('dwa') === true) && (str.contains('foo') === false));
  };


/***/ },
/* 15 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var indexOf = String.prototype.indexOf;

  module.exports = function (searchString/*, position*/) {
  	return indexOf.call(this, searchString, arguments[1]) > -1;
  };


/***/ },
/* 16 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  module.exports = function (fn) {
  	if (typeof fn !== 'function') throw new TypeError(fn + " is not a function");
  	return fn;
  };


/***/ },
/* 17 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var isEmpty = __webpack_require__(18)
    , value   = __webpack_require__(10)

    , hasOwnProperty = Object.prototype.hasOwnProperty;

  module.exports = function (obj/*, type*/) {
  	var type;
  	value(obj);
  	type = arguments[1];
  	if (arguments.length > 1) {
  		return hasOwnProperty.call(obj, '__ee__') && Boolean(obj.__ee__[type]);
  	}
  	return obj.hasOwnProperty('__ee__') && !isEmpty(obj.__ee__);
  };


/***/ },
/* 18 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var value = __webpack_require__(10)

    , propertyIsEnumerable = Object.prototype.propertyIsEnumerable;

  module.exports = function (obj) {
  	var i;
  	value(obj);
  	for (i in obj) { //jslint: ignore
  		if (propertyIsEnumerable.call(obj, i)) return false;
  	}
  	return true;
  };


/***/ },
/* 19 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";

  var WebSocket = __webpack_require__(20);
  var emitterify = __webpack_require__(22);

  exports.createMaster = function (now, config, port) {
    var WebSocketServer = WebSocket.Server;
    var master = new WebSocketServer({ port: port });

    master.on("connection", function (ws) {
      var emitter = emitterify(ws);

      // ping timesync messages (for the timesync module)
      emitter.on("time", function (data, callback) {
        callback(now());
      });

      // initially send the masters config
      emitter.send("config", sanitizedConfig());

      ws.emitter = emitter; // used by broadcast
    });

    master.broadcast = function (event, data) {
      master.clients.forEach(function (client) {
        client.emitter.send(event, data);
      });
    };

    master.broadcastConfig = function () {
      master.broadcast("config", sanitizedConfig());
    };

    function sanitizedConfig() {
      var curr = config();
      delete curr.time;
      delete curr.master;
      return curr;
    }

    function sendConfig(emitter) {
      // send current config, except for the fields master and time
      // which are not applicable for the slave. The time will be retrieved
      // later on via a separate timesync algorithm
      var curr = config();
      delete curr.time;
      delete curr.master;
      emitter.send("config", curr);
    }

    console.log("Master listening at ws://localhost:" + port);

    return master;
  };

/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";

  module.exports = typeof window === "undefined" || typeof window.WebSocket === "undefined" ? __webpack_require__(21) : window.WebSocket;

/***/ },
/* 21 */
/***/ function(module, exports, __webpack_require__) {

  module.exports = __WEBPACK_EXTERNAL_MODULE_21__;

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";

  // Turn a WebSocket in an event emitter.
  var eventEmitter = __webpack_require__(2);
  var Promise = __webpack_require__(23);

  var TIMEOUT = 60000; // ms
  // TODO: make timeout a configuration setting

  module.exports = function (socket) {
    var emitter = eventEmitter({
      socket: socket,
      send: send,
      request: request
    });

    /**
     * Send an event
     * @param {string} event
     * @param {*} data
     */
    function send(event, data) {
      var envelope = {
        event: event,
        data: data
      };
      socket.send(JSON.stringify(envelope));
    }

    /**
     * Request an event, await a response
     * @param {string} event
     * @param {*} data
     * @return {Promise} Returns a promise which resolves with the reply
     */
    function request(event, data) {
      return new Promise(function (resolve, reject) {
        // put the data in an envelope with id
        var id = getId();
        var envelope = {
          event: event,
          id: id,
          data: data
        };

        // add the request to the list with requests in progress
        queue[id] = {
          resolve: resolve,
          reject: reject,
          timeout: setTimeout(function () {
            delete queue[id];
            reject(new Error("Timeout"));
          }, TIMEOUT)
        };

        socket.send(JSON.stringify(envelope));
      });
    }

    /**
     * Event handler, handles incoming messages
     * @param {Object} event
     */
    socket.onmessage = function (event) {
      var data = event.data;
      var envelope = JSON.parse(data);

      // match the request from the id in the response
      var request = queue[envelope.id];
      if (request) {
        // incoming response
        clearTimeout(request.timeout);
        delete queue[envelope.id];
        request.resolve(envelope.data);
      } else if ("id" in envelope) {
        // incoming request
        emitter.emit(envelope.event, envelope.data, function (reply) {
          var response = {
            id: envelope.id,
            data: reply
          };
          socket.send(JSON.stringify(response));
        });
      } else {
        // regular incoming message
        emitter.emit(envelope.event, envelope.data);
      }
    };

    var queue = {}; // queue with requests in progress

    // get a unique id (simple counter)
    function getId() {
      return _id++;
    }
    var _id = 0;

    return emitter;
  };

/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";

  module.exports = typeof window === "undefined" || typeof window.Promise === "undefined" ? __webpack_require__(24) : window.Promise;

/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  module.exports = __webpack_require__(25)
  __webpack_require__(30)
  __webpack_require__(31)
  __webpack_require__(32)

/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var asap = __webpack_require__(26)

  module.exports = Promise;
  function Promise(fn) {
    if (typeof this !== 'object') throw new TypeError('Promises must be constructed via new')
    if (typeof fn !== 'function') throw new TypeError('not a function')
    var state = null
    var value = null
    var deferreds = []
    var self = this

    this.then = function(onFulfilled, onRejected) {
      return new self.constructor(function(resolve, reject) {
        handle(new Handler(onFulfilled, onRejected, resolve, reject))
      })
    }

    function handle(deferred) {
      if (state === null) {
        deferreds.push(deferred)
        return
      }
      asap(function() {
        var cb = state ? deferred.onFulfilled : deferred.onRejected
        if (cb === null) {
          (state ? deferred.resolve : deferred.reject)(value)
          return
        }
        var ret
        try {
          ret = cb(value)
        }
        catch (e) {
          deferred.reject(e)
          return
        }
        deferred.resolve(ret)
      })
    }

    function resolve(newValue) {
      try { //Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
        if (newValue === self) throw new TypeError('A promise cannot be resolved with itself.')
        if (newValue && (typeof newValue === 'object' || typeof newValue === 'function')) {
          var then = newValue.then
          if (typeof then === 'function') {
            doResolve(then.bind(newValue), resolve, reject)
            return
          }
        }
        state = true
        value = newValue
        finale()
      } catch (e) { reject(e) }
    }

    function reject(newValue) {
      state = false
      value = newValue
      finale()
    }

    function finale() {
      for (var i = 0, len = deferreds.length; i < len; i++)
        handle(deferreds[i])
      deferreds = null
    }

    doResolve(fn, resolve, reject)
  }


  function Handler(onFulfilled, onRejected, resolve, reject){
    this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null
    this.onRejected = typeof onRejected === 'function' ? onRejected : null
    this.resolve = resolve
    this.reject = reject
  }

  /**
   * Take a potentially misbehaving resolver function and make sure
   * onFulfilled and onRejected are only called once.
   *
   * Makes no guarantees about asynchrony.
   */
  function doResolve(fn, onFulfilled, onRejected) {
    var done = false;
    try {
      fn(function (value) {
        if (done) return
        done = true
        onFulfilled(value)
      }, function (reason) {
        if (done) return
        done = true
        onRejected(reason)
      })
    } catch (ex) {
      if (done) return
      done = true
      onRejected(ex)
    }
  }


/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(process, setImmediate) {
  // Use the fastest possible means to execute a task in a future turn
  // of the event loop.

  // linked list of tasks (single, with head node)
  var head = {task: void 0, next: null};
  var tail = head;
  var flushing = false;
  var requestFlush = void 0;
  var isNodeJS = false;

  function flush() {
      /* jshint loopfunc: true */

      while (head.next) {
          head = head.next;
          var task = head.task;
          head.task = void 0;
          var domain = head.domain;

          if (domain) {
              head.domain = void 0;
              domain.enter();
          }

          try {
              task();

          } catch (e) {
              if (isNodeJS) {
                  // In node, uncaught exceptions are considered fatal errors.
                  // Re-throw them synchronously to interrupt flushing!

                  // Ensure continuation if the uncaught exception is suppressed
                  // listening "uncaughtException" events (as domains does).
                  // Continue in next event to avoid tick recursion.
                  if (domain) {
                      domain.exit();
                  }
                  setTimeout(flush, 0);
                  if (domain) {
                      domain.enter();
                  }

                  throw e;

              } else {
                  // In browsers, uncaught exceptions are not fatal.
                  // Re-throw them asynchronously to avoid slow-downs.
                  setTimeout(function() {
                     throw e;
                  }, 0);
              }
          }

          if (domain) {
              domain.exit();
          }
      }

      flushing = false;
  }

  if (typeof process !== "undefined" && process.nextTick) {
      // Node.js before 0.9. Note that some fake-Node environments, like the
      // Mocha test runner, introduce a `process` global without a `nextTick`.
      isNodeJS = true;

      requestFlush = function () {
          process.nextTick(flush);
      };

  } else if (typeof setImmediate === "function") {
      // In IE10, Node.js 0.9+, or https://github.com/NobleJS/setImmediate
      if (typeof window !== "undefined") {
          requestFlush = setImmediate.bind(window, flush);
      } else {
          requestFlush = function () {
              setImmediate(flush);
          };
      }

  } else if (typeof MessageChannel !== "undefined") {
      // modern browsers
      // http://www.nonblocking.io/2011/06/windownexttick.html
      var channel = new MessageChannel();
      channel.port1.onmessage = flush;
      requestFlush = function () {
          channel.port2.postMessage(0);
      };

  } else {
      // old browsers
      requestFlush = function () {
          setTimeout(flush, 0);
      };
  }

  function asap(task) {
      tail = tail.next = {
          task: task,
          domain: isNodeJS && process.domain,
          next: null
      };

      if (!flushing) {
          flushing = true;
          requestFlush();
      }
  };

  module.exports = asap;

  
  /* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(27), __webpack_require__(28).setImmediate))

/***/ },
/* 27 */
/***/ function(module, exports, __webpack_require__) {

  // shim for using process in browser

  var process = module.exports = {};

  process.nextTick = (function () {
      var canSetImmediate = typeof window !== 'undefined'
      && window.setImmediate;
      var canMutationObserver = typeof window !== 'undefined'
      && window.MutationObserver;
      var canPost = typeof window !== 'undefined'
      && window.postMessage && window.addEventListener
      ;

      if (canSetImmediate) {
          return function (f) { return window.setImmediate(f) };
      }

      var queue = [];

      if (canMutationObserver) {
          var hiddenDiv = document.createElement("div");
          var observer = new MutationObserver(function () {
              var queueList = queue.slice();
              queue.length = 0;
              queueList.forEach(function (fn) {
                  fn();
              });
          });

          observer.observe(hiddenDiv, { attributes: true });

          return function nextTick(fn) {
              if (!queue.length) {
                  hiddenDiv.setAttribute('yes', 'no');
              }
              queue.push(fn);
          };
      }

      if (canPost) {
          window.addEventListener('message', function (ev) {
              var source = ev.source;
              if ((source === window || source === null) && ev.data === 'process-tick') {
                  ev.stopPropagation();
                  if (queue.length > 0) {
                      var fn = queue.shift();
                      fn();
                  }
              }
          }, true);

          return function nextTick(fn) {
              queue.push(fn);
              window.postMessage('process-tick', '*');
          };
      }

      return function nextTick(fn) {
          setTimeout(fn, 0);
      };
  })();

  process.title = 'browser';
  process.browser = true;
  process.env = {};
  process.argv = [];

  function noop() {}

  process.on = noop;
  process.addListener = noop;
  process.once = noop;
  process.off = noop;
  process.removeListener = noop;
  process.removeAllListeners = noop;
  process.emit = noop;

  process.binding = function (name) {
      throw new Error('process.binding is not supported');
  };

  // TODO(shtylman)
  process.cwd = function () { return '/' };
  process.chdir = function (dir) {
      throw new Error('process.chdir is not supported');
  };


/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

  /* WEBPACK VAR INJECTION */(function(setImmediate, clearImmediate) {var nextTick = __webpack_require__(29).nextTick;
  var slice = Array.prototype.slice;
  var immediateIds = {};
  var nextImmediateId = 0;

  // DOM APIs, for completeness

  if (typeof setTimeout !== 'undefined') exports.setTimeout = function() { return setTimeout.apply(window, arguments); };
  if (typeof clearTimeout !== 'undefined') exports.clearTimeout = function() { clearTimeout.apply(window, arguments); };
  if (typeof setInterval !== 'undefined') exports.setInterval = function() { return setInterval.apply(window, arguments); };
  if (typeof clearInterval !== 'undefined') exports.clearInterval = function() { clearInterval.apply(window, arguments); };

  // TODO: Change to more efficient list approach used in Node.js
  // For now, we just implement the APIs using the primitives above.

  exports.enroll = function(item, delay) {
    item._timeoutID = setTimeout(item._onTimeout, delay);
  };

  exports.unenroll = function(item) {
    clearTimeout(item._timeoutID);
  };

  exports.active = function(item) {
    // our naive impl doesn't care (correctness is still preserved)
  };

  // That's not how node.js implements it but the exposed api is the same.
  exports.setImmediate = typeof setImmediate === "function" ? setImmediate : function(fn) {
    var id = nextImmediateId++;
    var args = arguments.length < 2 ? false : slice.call(arguments, 1);

    immediateIds[id] = true;

    nextTick(function onNextTick() {
      if (immediateIds[id]) {
        // fn.call() is faster so we optimize for the common use-case
        // @see http://jsperf.com/call-apply-segu
        if (args) {
          fn.apply(null, args);
        } else {
          fn.call(null);
        }
        // Prevent ids from leaking
        exports.clearImmediate(id);
      }
    });

    return id;
  };

  exports.clearImmediate = typeof clearImmediate === "function" ? clearImmediate : function(id) {
    delete immediateIds[id];
  };
  /* WEBPACK VAR INJECTION */}.call(exports, __webpack_require__(28).setImmediate, __webpack_require__(28).clearImmediate))

/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

  // shim for using process in browser

  var process = module.exports = {};
  var queue = [];
  var draining = false;

  function drainQueue() {
      if (draining) {
          return;
      }
      draining = true;
      var currentQueue;
      var len = queue.length;
      while(len) {
          currentQueue = queue;
          queue = [];
          var i = -1;
          while (++i < len) {
              currentQueue[i]();
          }
          len = queue.length;
      }
      draining = false;
  }
  process.nextTick = function (fun) {
      queue.push(fun);
      if (!draining) {
          setTimeout(drainQueue, 0);
      }
  };

  process.title = 'browser';
  process.browser = true;
  process.env = {};
  process.argv = [];
  process.version = ''; // empty string to avoid regexp issues

  function noop() {}

  process.on = noop;
  process.addListener = noop;
  process.once = noop;
  process.off = noop;
  process.removeListener = noop;
  process.removeAllListeners = noop;
  process.emit = noop;

  process.binding = function (name) {
      throw new Error('process.binding is not supported');
  };

  // TODO(shtylman)
  process.cwd = function () { return '/' };
  process.chdir = function (dir) {
      throw new Error('process.chdir is not supported');
  };
  process.umask = function() { return 0; };


/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var Promise = __webpack_require__(25)
  var asap = __webpack_require__(26)

  module.exports = Promise
  Promise.prototype.done = function (onFulfilled, onRejected) {
    var self = arguments.length ? this.then.apply(this, arguments) : this
    self.then(null, function (err) {
      asap(function () {
        throw err
      })
    })
  }

/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  //This file contains the ES6 extensions to the core Promises/A+ API

  var Promise = __webpack_require__(25)
  var asap = __webpack_require__(26)

  module.exports = Promise

  /* Static Functions */

  function ValuePromise(value) {
    this.then = function (onFulfilled) {
      if (typeof onFulfilled !== 'function') return this
      return new Promise(function (resolve, reject) {
        asap(function () {
          try {
            resolve(onFulfilled(value))
          } catch (ex) {
            reject(ex);
          }
        })
      })
    }
  }
  ValuePromise.prototype = Promise.prototype

  var TRUE = new ValuePromise(true)
  var FALSE = new ValuePromise(false)
  var NULL = new ValuePromise(null)
  var UNDEFINED = new ValuePromise(undefined)
  var ZERO = new ValuePromise(0)
  var EMPTYSTRING = new ValuePromise('')

  Promise.resolve = function (value) {
    if (value instanceof Promise) return value

    if (value === null) return NULL
    if (value === undefined) return UNDEFINED
    if (value === true) return TRUE
    if (value === false) return FALSE
    if (value === 0) return ZERO
    if (value === '') return EMPTYSTRING

    if (typeof value === 'object' || typeof value === 'function') {
      try {
        var then = value.then
        if (typeof then === 'function') {
          return new Promise(then.bind(value))
        }
      } catch (ex) {
        return new Promise(function (resolve, reject) {
          reject(ex)
        })
      }
    }

    return new ValuePromise(value)
  }

  Promise.all = function (arr) {
    var args = Array.prototype.slice.call(arr)

    return new Promise(function (resolve, reject) {
      if (args.length === 0) return resolve([])
      var remaining = args.length
      function res(i, val) {
        try {
          if (val && (typeof val === 'object' || typeof val === 'function')) {
            var then = val.then
            if (typeof then === 'function') {
              then.call(val, function (val) { res(i, val) }, reject)
              return
            }
          }
          args[i] = val
          if (--remaining === 0) {
            resolve(args);
          }
        } catch (ex) {
          reject(ex)
        }
      }
      for (var i = 0; i < args.length; i++) {
        res(i, args[i])
      }
    })
  }

  Promise.reject = function (value) {
    return new Promise(function (resolve, reject) { 
      reject(value);
    });
  }

  Promise.race = function (values) {
    return new Promise(function (resolve, reject) { 
      values.forEach(function(value){
        Promise.resolve(value).then(resolve, reject);
      })
    });
  }

  /* Prototype Methods */

  Promise.prototype['catch'] = function (onRejected) {
    return this.then(null, onRejected);
  }


/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  //This file contains then/promise specific extensions that are only useful for node.js interop

  var Promise = __webpack_require__(25)
  var asap = __webpack_require__(26)

  module.exports = Promise

  /* Static Functions */

  Promise.denodeify = function (fn, argumentCount) {
    argumentCount = argumentCount || Infinity
    return function () {
      var self = this
      var args = Array.prototype.slice.call(arguments)
      return new Promise(function (resolve, reject) {
        while (args.length && args.length > argumentCount) {
          args.pop()
        }
        args.push(function (err, res) {
          if (err) reject(err)
          else resolve(res)
        })
        var res = fn.apply(self, args)
        if (res && (typeof res === 'object' || typeof res === 'function') && typeof res.then === 'function') {
          resolve(res)
        }
      })
    }
  }
  Promise.nodeify = function (fn) {
    return function () {
      var args = Array.prototype.slice.call(arguments)
      var callback = typeof args[args.length - 1] === 'function' ? args.pop() : null
      var ctx = this
      try {
        return fn.apply(this, arguments).nodeify(callback, ctx)
      } catch (ex) {
        if (callback === null || typeof callback == 'undefined') {
          return new Promise(function (resolve, reject) { reject(ex) })
        } else {
          asap(function () {
            callback.call(ctx, ex)
          })
        }
      }
    }
  }

  Promise.prototype.nodeify = function (callback, ctx) {
    if (typeof callback != 'function') return this

    this.then(function (value) {
      asap(function () {
        callback.call(ctx, null, value)
      })
    }, function (err) {
      asap(function () {
        callback.call(ctx, err)
      })
    })
  }


/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";

  var WebSocket = __webpack_require__(20);
  var Promise = __webpack_require__(23);
  var emitterify = __webpack_require__(22);
  var stat = __webpack_require__(35);
  var util = __webpack_require__(36);

  // TODO: make these constants configurable
  var INTERVAL = 3600000; // once an hour
  var DELAY = 1000; // delay between individual requests
  var REPEAT = 5; // number of times to request the time for determining latency

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
        return getLatency(slave).then(function (latency) {
          return result = latency;
        }) // store the retrieved latency
        ["catch"](function (err) {
          return console.log(err);
        }) // just ignore failed requests
        .then(function () {
          return util.wait(DELAY);
        }) // wait 1 sec
        .then(function () {
          return result;
        }); // return the retrieved latency
      }

      return util.repeat(getLatencyAndWait, REPEAT).then(function (all) {
        // filter away failed requests
        var latencies = all.filter(function (latency) {
          return latency !== null;
        });

        // calculate the limit for outliers
        var limit = stat.median(latencies) + stat.std(latencies);

        // filter away outliers: all latencies largereq than the mean+std
        var filtered = latencies.filter(function (latency) {
          return latency < limit;
        });

        // return the mean latency
        return filtered.length > 0 ? stat.mean(filtered) : null;
      }).then(function (latency) {
        return slave.request("time").then(function (timestamp) {
          var time = timestamp + latency;
          slave.emit("change", time);
          return time;
        });
      })["catch"](function (err) {
        return slave.emit("error", err);
      });
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

      return emitter.request("time").then(function (timestamp) {
        var end = Date.now();
        var latency = (end - start) / 2;
        var time = timestamp + latency;

        // apply the first ever retrieved offset immediately.
        if (isFirst) {
          isFirst = false;
          emitter.emit("change", time);
        }

        return latency;
      });
    }

    return slave;
  };

/***/ },
/* 34 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";

  /* istanbul ignore else */
  if (typeof Date.now === "function") {
    /**
     * Helper function to get the current time
     * @return {number} Current time
     */
    exports.systemNow = function () {
      return Date.now();
    };
  } else {
    /**
     * Helper function to get the current time
     * @return {number} Current time
     */
    exports.systemNow = function () {
      return new Date().valueOf();
    };
  }

  /**
   * Shuffle an array
   *
   * + Jonas Raoni Soares Silva
   * @ http://jsfromhell.com/array/shuffle [v1.0]
   *
   * @param {Array} o   Array to be shuffled
   * @returns {Array}   Returns the shuffled array
   */
  exports.shuffle = function (o) {
    for (var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  };

/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";

  // basic statistical functions

  exports.compare = compare;
  exports.add = add;
  exports.sum = sum;
  exports.mean = mean;
  exports.std = std;
  exports.variance = variance;
  exports.median = median;
  function compare(a, b) {
    return a > b ? 1 : a < b ? -1 : 0;
  }

  function add(a, b) {
    return a + b;
  }

  function sum(arr) {
    return arr.reduce(add);
  }

  function mean(arr) {
    return sum(arr) / arr.length;
  }

  function std(arr) {
    return Math.sqrt(variance(arr));
  }

  function variance(arr) {
    if (arr.length < 2) {
      return 0;
    }var _mean = mean(arr);
    return arr.map(function (x) {
      return Math.pow(x - _mean, 2);
    }).reduce(add) / (arr.length - 1);
  }

  function median(arr) {
    if (arr.length < 2) {
      return arr[0];
    }var sorted = arr.slice().sort(compare);
    if (sorted.length % 2 === 0) {
      // even
      return (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
    } else {
      // odd
      return arr[(arr.length - 1) / 2];
    }
  }
  Object.defineProperty(exports, "__esModule", {
    value: true
  });

/***/ },
/* 36 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";

  /**
   * Resolve a promise after a delay
   * @param {number} delay    A delay in milliseconds
   * @returns {Promise} Resolves after given delay
   */
  exports.wait = wait;

  /**
   * Repeat a given asynchronous function a number of times
   * @param {function} fn   A function returning a promise
   * @param {number} times
   * @return {Promise}
   */
  exports.repeat = repeat;

  /**
   * Repeat an asynchronous callback function whilst
   * @param {function} condition   A function returning true or false
   * @param {function} callback    A callback returning a Promise
   * @returns {Promise}
   */
  exports.whilst = whilst;
  var Promise = __webpack_require__(23);function wait(delay) {
    return new Promise(function (resolve) {
      setTimeout(resolve, delay);
    });
  }function repeat(fn, times) {
    return new Promise(function (resolve, reject) {
      var count = 0;
      var results = [];

      function recurse() {
        if (count < times) {
          count++;
          fn().then(function (result) {
            results.push(result);
            recurse();
          });
        } else {
          resolve(results);
        }
      }

      recurse();
    });
  }function whilst(condition, callback) {
    return new Promise(function (resolve, reject) {
      function recurse() {
        if (condition()) {
          callback().then(function () {
            return recurse();
          });
        } else {
          resolve();
        }
      }

      recurse();
    });
  }
  Object.defineProperty(exports, "__esModule", {
    value: true
  });

/***/ }
/******/ ])
});
