/**
 * hypertimer.js
 * https://github.com/enmasseio/hypertimer
 *
 * Time control for simulations.
 *
 * Run a timer at a faster or slower pace than real-time, or run discrete events.
 *
 * @version 2.1.3
 * @date    2015-12-08
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
		module.exports = factory(require("ws"), require("debug"));
	else if(typeof define === 'function' && define.amd)
		define(["ws", "debug"], factory);
	else if(typeof exports === 'object')
		exports["hypertimer"] = factory(require("ws"), require("debug"));
	else
		root["hypertimer"] = factory(root["ws"], root["debug"]);
})(this, function(__WEBPACK_EXTERNAL_MODULE_21__, __WEBPACK_EXTERNAL_MODULE_34__) {
return /******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

  module.exports = __webpack_require__(1);


/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

  var emitter = __webpack_require__(2);
  var hasListeners = __webpack_require__(17);
  var createMaster = __webpack_require__(19).createMaster;
  var createSlave = __webpack_require__(35).createSlave;
  var util = __webpack_require__(38);

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
    var rate = 1;             // number of milliseconds per milliseconds
    var deterministic = true; // run simultaneous events in a deterministic order
    var configuredTime = null;// only used for returning the configured time on .config()
    var master = null;        // url of master, will run as slave
    var port = null;          // port to serve as master

    // properties
    var running = false;              // true when running
    var startTime = null;             // timestamp. the moment in real-time when hyperTime was set
    var hyperTime = util.systemNow(); // timestamp. the start time in hyper-time
    var timeouts = [];                // array with all running timeouts
    var current = {};                 // the timeouts currently in progress (callback is being executed)
    var timeoutId = null;             // currently running timer
    var idSeq = 0;                    // counter for unique timeout id's
    var server = null;
    var client = null;

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
    timer.config = function(options) {
      if (options) {
        _validateConfig(options);
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
        }
        else {
          return hyperTime;
        }
      }
      else {
        return hyperTime;
      }
    };

    /**
     * Continue the timer.
     */
    timer['continue'] = function() {
      startTime = util.systemNow();
      running = true;

      // reschedule running timeouts
      _schedule();
    };

    /**
     * Pause the timer. The timer can be continued again with `continue()`
     */
    timer.pause = function() {
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
    timer.setInterval = function(callback, interval, firstTime) {
      var id = idSeq++;

      var _interval = Number(interval);
      if (isNaN(_interval)) {
        throw new TypeError('interval must be a number');
      }
      if (_interval < 0 || !isFinite(_interval)) {
        _interval = 0;
      }

      var _firstTime = (firstTime != undefined) ?
          toTimestamp(firstTime) :
          null;

      var now = timer.now();
      var _time = (_firstTime != null) ? _firstTime : (now + _interval);

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
     * Destroy the timer. This will clear all timeouts, and close connections
     * to a master or to slave timers.
     */
    timer.destroy = function () {
      timer.clear();
      if (client) client.destroy();
      if (server) server.destroy();
    };

    /**
     * Get the current configuration
     * @returns {{paced: boolean, rate: number, deterministic: boolean, time: *, master: *}}
     *                Returns a copy of the current configuration
     * @private
     */
    function _getConfig () {
      return {
        paced: paced,
        rate: rate,
        deterministic: deterministic,
        time: configuredTime,
        master: master,
        port: port
      }
    }

    /**
     * Validate configuration, depending on the current mode: slave or normal
     * @param {Object} options
     * @private
     */
    function _validateConfig (options) {
      // validate writable options
      if (client || options.master) {
        // when we are a slave, we can't adjust the config, except for
        // changing the master url or becoming a master itself (port configured)
        for (var prop in options) {
          if (prop !== 'master' && prop !== 'slave') {
            throw new Error('Cannot apply configuration option "'  + prop +'", timer is configured as slave.');
          }
        }
      }
    }

    /**
     * Change configuration
     * @param {{paced: boolean, rate: number, deterministic: boolean, time: *, master: *}} options
     * @private
     */
    function _setConfig(options) {
      if ('deterministic' in options) {
        deterministic = options.deterministic ? true : false;
      }

      if ('paced' in options) {
        paced = options.paced ? true : false;
      }

      // important: apply time before rate
      if ('time' in options) {
        hyperTime = toTimestamp(options.time);
        startTime = util.systemNow();

        // update intervals
        _rescheduleIntervals(hyperTime);

        configuredTime = new Date(hyperTime).toISOString();
      }

      if ('rate' in options) {
        var newRate = Number(options.rate);
        if (isNaN(newRate) || newRate <= 0) {
          throw new TypeError('Invalid rate ' + JSON.stringify(options.rate) + '. Rate must be a positive number');
        }

        // important: first get the new hyperTime, then adjust the startTime
        hyperTime = timer.now();
        startTime = util.systemNow();
        rate = newRate;
      }

      if ('master' in options) {
        // create a timesync slave, connect to master via a websocket
        if (client) {
          client.destroy();
          client = null;
        }

        master = options.master;
        if (options.master != null) {
          client = createSlave(options.master);

          function applyConfig(config) {
            var prev = _getConfig();
            _setConfig(config);
            var curr = _getConfig();
            timer.emit('config', curr, prev);
          }

          client.on('change', function (time)   { applyConfig({time: time}) });
          client.on('config', function (config) { applyConfig(config) });
          client.on('error',  function (err)    { timer.emit('error', err) });
        }
      }

      // create a master
      if ('port' in options) {
        if (server) {
          server.destroy();
          server = null;
        }

        port = options.port;
        if (options.port) {
          server = createMaster(timer.now, timer.config, options.port);
          server.on('error', function (err) { timer.emit('error', err) });
        }
      }

      // reschedule running timeouts
      _schedule();

      if (server) {
        // broadcast changed config
        server.broadcastConfig();
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
      timeout.occurrence = Math.round((now - timeout.firstTime) / timeout.interval);
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
        if (hasListeners(timer, 'error')) {
          timer.emit('error', err);
        }
        else {
          console.log('Error', err);
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
        // schedule next timeout
        var time = next.time;
        var delay = time - timer.now();
        var realDelay = paced ? delay / rate : 0;

        function onTimeout() {
          // when running in non-paced mode, update the hyperTime to
          // adjust the time of the current event
          if (!paced) {
            hyperTime = (time > hyperTime && isFinite(time)) ? time : hyperTime;
          }

          // grab all expired timeouts from the queue
          var expired = _getExpiredTimeouts(time);
          // note: expired.length can never be zero (on every change of the queue, we reschedule)

          // execute all expired timeouts
          if (paced) {
            // in paced mode, we fire all timeouts in parallel,
            // and don't await their completion (they can do async operations)
            expired.forEach(function (timeout) {
              _execTimeout(timeout);
            });

            // schedule the next round
            _schedule();
          }
          else {
            // in non-paced mode, we execute all expired timeouts serially,
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
        }

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
      var value =
          (typeof date === 'number') ? date :           // number
          (date instanceof Date)     ? date.valueOf() : // Date
          new Date(date).valueOf();                     // ISOString, momentjs, ...

      if (isNaN(value)) {
        throw new TypeError('Invalid date ' + JSON.stringify(date) + '. ' +
            'Date, number, or ISOString expected');
      }

      return value;
    }

    Object.defineProperty(timer, 'running', {
      get: function () {
        return running;
      }
    });

    timer.config(options);  // apply options
    timer.continue();       // start the timer

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
/***/ function(module, exports) {

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
/***/ function(module, exports) {

  'use strict';

  module.exports = function () {
  	try {
  		Object.keys('primitive');
  		return true;
  	} catch (e) { return false; }
  };


/***/ },
/* 9 */
/***/ function(module, exports) {

  'use strict';

  var keys = Object.keys;

  module.exports = function (object) {
  	return keys(object == null ? object : Object(object));
  };


/***/ },
/* 10 */
/***/ function(module, exports) {

  'use strict';

  module.exports = function (value) {
  	if (value == null) throw new TypeError("Cannot use null or undefined");
  	return value;
  };


/***/ },
/* 11 */
/***/ function(module, exports) {

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
/***/ function(module, exports) {

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
/***/ function(module, exports) {

  'use strict';

  var str = 'razdwatrzy';

  module.exports = function () {
  	if (typeof str.contains !== 'function') return false;
  	return ((str.contains('dwa') === true) && (str.contains('foo') === false));
  };


/***/ },
/* 15 */
/***/ function(module, exports) {

  'use strict';

  var indexOf = String.prototype.indexOf;

  module.exports = function (searchString/*, position*/) {
  	return indexOf.call(this, searchString, arguments[1]) > -1;
  };


/***/ },
/* 16 */
/***/ function(module, exports) {

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

  var WebSocket = __webpack_require__(20);
  var emitter = __webpack_require__(22);
  var debug = __webpack_require__(33)('hypertimer:master');

  exports.createMaster = function (now, config, port) {
    var master = new WebSocket.Server({port: port});

    master.on('connection', function (ws) {
      debug('new connection');

      var _emitter = emitter(ws);

      // ping timesync messages (for the timesync module)
      _emitter.on('time', function (data, callback) {
        var time = now();
        callback(time);
        debug('send time ' + new Date(time).toISOString());
      });

      // send the masters config to the new connection
      var config = sanitizedConfig();
      debug('send config', config);
      _emitter.send('config', config);

      ws.emitter = _emitter; // used by broadcast
    });

    master.broadcast = function (event, data) {
      debug('broadcast', event, data);
      master.clients.forEach(function (client) {
        client.emitter.send(event, data);
      });
    };

    master.broadcastConfig = function () {
      master.broadcast('config', sanitizedConfig());
    };

    master.destroy = function() {
      master.close();
      debug('destroyed');
    };

    function sanitizedConfig() {
      var curr = config();
      delete curr.time;
      delete curr.master;
      delete curr.port;
      return curr;
    }

    debug('listening at ws://localhost:' + port);

    return master;
  };


/***/ },
/* 20 */
/***/ function(module, exports, __webpack_require__) {

  module.exports = (typeof window === 'undefined' || typeof window.WebSocket === 'undefined') ?
      __webpack_require__(21) :
      window.WebSocket;


/***/ },
/* 21 */
/***/ function(module, exports) {

  module.exports = __WEBPACK_EXTERNAL_MODULE_21__;

/***/ },
/* 22 */
/***/ function(module, exports, __webpack_require__) {

  // Turn a WebSocket in an event emitter.
  var eventEmitter = __webpack_require__(2);
  var Promise = __webpack_require__(23);
  var debug = __webpack_require__(33)('hypertimer:socket');

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
    function send (event, data) {
      var envelope = {
        event: event,
        data: data
      };
      debug('send', envelope);
      socket.send(JSON.stringify(envelope));
    }

    /**
     * Request an event, await a response
     * @param {string} event
     * @param {*} data
     * @return {Promise} Returns a promise which resolves with the reply
     */
    function request (event, data) {
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
            reject(new Error('Timeout'));
          }, TIMEOUT)
        };

        debug('request', envelope);
        socket.send(JSON.stringify(envelope));
      }).catch(function (err) {console.log('ERROR', err)});
    }

    /**
     * Event handler, handles incoming messages
     * @param {Object} event
     */
    socket.onmessage = function (event) {
      var data = event.data;
      var envelope = JSON.parse(data);
      debug('receive', envelope);

      // match the request from the id in the response
      var request = queue[envelope.id];
      if (request) {
        // incoming response
        clearTimeout(request.timeout);
        delete queue[envelope.id];
        request.resolve(envelope.data);
      }
      else if ('id' in envelope) {
        // incoming request
        emitter.emit(envelope.event, envelope.data, function (reply) {
          var response = {
            id: envelope.id,
            data: reply
          };

          if (socket.readyState === socket.OPEN || socket.readyState === socket.CONNECTING) {
            debug('reply', response);
            socket.send(JSON.stringify(response));
          }
          else {
            debug('cancel reply', response, '(socket is closed)');
          }
        });
      }
      else {
        // regular incoming message
        emitter.emit(envelope.event, envelope.data);
      }
    };

    var queue = {};   // queue with requests in progress

    // get a unique id (simple counter)
    function getId () {
      return _id++;
    }
    var _id = 0;

    return emitter;
  };


/***/ },
/* 23 */
/***/ function(module, exports, __webpack_require__) {

  module.exports = (typeof window === 'undefined' || typeof window.Promise === 'undefined') ?
      __webpack_require__(24) :
      window.Promise;


/***/ },
/* 24 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  module.exports = __webpack_require__(25)


/***/ },
/* 25 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  module.exports = __webpack_require__(26);
  __webpack_require__(28);
  __webpack_require__(29);
  __webpack_require__(30);
  __webpack_require__(31);


/***/ },
/* 26 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var asap = __webpack_require__(27);

  function noop() {}

  // States:
  //
  // 0 - pending
  // 1 - fulfilled with _value
  // 2 - rejected with _value
  // 3 - adopted the state of another promise, _value
  //
  // once the state is no longer pending (0) it is immutable

  // All `_` prefixed properties will be reduced to `_{random number}`
  // at build time to obfuscate them and discourage their use.
  // We don't use symbols or Object.defineProperty to fully hide them
  // because the performance isn't good enough.


  // to avoid using try/catch inside critical functions, we
  // extract them to here.
  var LAST_ERROR = null;
  var IS_ERROR = {};
  function getThen(obj) {
    try {
      return obj.then;
    } catch (ex) {
      LAST_ERROR = ex;
      return IS_ERROR;
    }
  }

  function tryCallOne(fn, a) {
    try {
      return fn(a);
    } catch (ex) {
      LAST_ERROR = ex;
      return IS_ERROR;
    }
  }
  function tryCallTwo(fn, a, b) {
    try {
      fn(a, b);
    } catch (ex) {
      LAST_ERROR = ex;
      return IS_ERROR;
    }
  }

  module.exports = Promise;

  function Promise(fn) {
    if (typeof this !== 'object') {
      throw new TypeError('Promises must be constructed via new');
    }
    if (typeof fn !== 'function') {
      throw new TypeError('not a function');
    }
    this._37 = 0;
    this._12 = null;
    this._59 = [];
    if (fn === noop) return;
    doResolve(fn, this);
  }
  Promise._99 = noop;

  Promise.prototype.then = function(onFulfilled, onRejected) {
    if (this.constructor !== Promise) {
      return safeThen(this, onFulfilled, onRejected);
    }
    var res = new Promise(noop);
    handle(this, new Handler(onFulfilled, onRejected, res));
    return res;
  };

  function safeThen(self, onFulfilled, onRejected) {
    return new self.constructor(function (resolve, reject) {
      var res = new Promise(noop);
      res.then(resolve, reject);
      handle(self, new Handler(onFulfilled, onRejected, res));
    });
  };
  function handle(self, deferred) {
    while (self._37 === 3) {
      self = self._12;
    }
    if (self._37 === 0) {
      self._59.push(deferred);
      return;
    }
    asap(function() {
      var cb = self._37 === 1 ? deferred.onFulfilled : deferred.onRejected;
      if (cb === null) {
        if (self._37 === 1) {
          resolve(deferred.promise, self._12);
        } else {
          reject(deferred.promise, self._12);
        }
        return;
      }
      var ret = tryCallOne(cb, self._12);
      if (ret === IS_ERROR) {
        reject(deferred.promise, LAST_ERROR);
      } else {
        resolve(deferred.promise, ret);
      }
    });
  }
  function resolve(self, newValue) {
    // Promise Resolution Procedure: https://github.com/promises-aplus/promises-spec#the-promise-resolution-procedure
    if (newValue === self) {
      return reject(
        self,
        new TypeError('A promise cannot be resolved with itself.')
      );
    }
    if (
      newValue &&
      (typeof newValue === 'object' || typeof newValue === 'function')
    ) {
      var then = getThen(newValue);
      if (then === IS_ERROR) {
        return reject(self, LAST_ERROR);
      }
      if (
        then === self.then &&
        newValue instanceof Promise
      ) {
        self._37 = 3;
        self._12 = newValue;
        finale(self);
        return;
      } else if (typeof then === 'function') {
        doResolve(then.bind(newValue), self);
        return;
      }
    }
    self._37 = 1;
    self._12 = newValue;
    finale(self);
  }

  function reject(self, newValue) {
    self._37 = 2;
    self._12 = newValue;
    finale(self);
  }
  function finale(self) {
    for (var i = 0; i < self._59.length; i++) {
      handle(self, self._59[i]);
    }
    self._59 = null;
  }

  function Handler(onFulfilled, onRejected, promise){
    this.onFulfilled = typeof onFulfilled === 'function' ? onFulfilled : null;
    this.onRejected = typeof onRejected === 'function' ? onRejected : null;
    this.promise = promise;
  }

  /**
   * Take a potentially misbehaving resolver function and make sure
   * onFulfilled and onRejected are only called once.
   *
   * Makes no guarantees about asynchrony.
   */
  function doResolve(fn, promise) {
    var done = false;
    var res = tryCallTwo(fn, function (value) {
      if (done) return;
      done = true;
      resolve(promise, value);
    }, function (reason) {
      if (done) return;
      done = true;
      reject(promise, reason);
    })
    if (!done && res === IS_ERROR) {
      done = true;
      reject(promise, LAST_ERROR);
    }
  }


/***/ },
/* 27 */
/***/ function(module, exports) {

  /* WEBPACK VAR INJECTION */(function(global) {"use strict";

  // Use the fastest means possible to execute a task in its own turn, with
  // priority over other events including IO, animation, reflow, and redraw
  // events in browsers.
  //
  // An exception thrown by a task will permanently interrupt the processing of
  // subsequent tasks. The higher level `asap` function ensures that if an
  // exception is thrown by a task, that the task queue will continue flushing as
  // soon as possible, but if you use `rawAsap` directly, you are responsible to
  // either ensure that no exceptions are thrown from your task, or to manually
  // call `rawAsap.requestFlush` if an exception is thrown.
  module.exports = rawAsap;
  function rawAsap(task) {
      if (!queue.length) {
          requestFlush();
          flushing = true;
      }
      // Equivalent to push, but avoids a function call.
      queue[queue.length] = task;
  }

  var queue = [];
  // Once a flush has been requested, no further calls to `requestFlush` are
  // necessary until the next `flush` completes.
  var flushing = false;
  // `requestFlush` is an implementation-specific method that attempts to kick
  // off a `flush` event as quickly as possible. `flush` will attempt to exhaust
  // the event queue before yielding to the browser's own event loop.
  var requestFlush;
  // The position of the next task to execute in the task queue. This is
  // preserved between calls to `flush` so that it can be resumed if
  // a task throws an exception.
  var index = 0;
  // If a task schedules additional tasks recursively, the task queue can grow
  // unbounded. To prevent memory exhaustion, the task queue will periodically
  // truncate already-completed tasks.
  var capacity = 1024;

  // The flush function processes all tasks that have been scheduled with
  // `rawAsap` unless and until one of those tasks throws an exception.
  // If a task throws an exception, `flush` ensures that its state will remain
  // consistent and will resume where it left off when called again.
  // However, `flush` does not make any arrangements to be called again if an
  // exception is thrown.
  function flush() {
      while (index < queue.length) {
          var currentIndex = index;
          // Advance the index before calling the task. This ensures that we will
          // begin flushing on the next task the task throws an error.
          index = index + 1;
          queue[currentIndex].call();
          // Prevent leaking memory for long chains of recursive calls to `asap`.
          // If we call `asap` within tasks scheduled by `asap`, the queue will
          // grow, but to avoid an O(n) walk for every task we execute, we don't
          // shift tasks off the queue after they have been executed.
          // Instead, we periodically shift 1024 tasks off the queue.
          if (index > capacity) {
              // Manually shift all values starting at the index back to the
              // beginning of the queue.
              for (var scan = 0, newLength = queue.length - index; scan < newLength; scan++) {
                  queue[scan] = queue[scan + index];
              }
              queue.length -= index;
              index = 0;
          }
      }
      queue.length = 0;
      index = 0;
      flushing = false;
  }

  // `requestFlush` is implemented using a strategy based on data collected from
  // every available SauceLabs Selenium web driver worker at time of writing.
  // https://docs.google.com/spreadsheets/d/1mG-5UYGup5qxGdEMWkhP6BWCz053NUb2E1QoUTU16uA/edit#gid=783724593

  // Safari 6 and 6.1 for desktop, iPad, and iPhone are the only browsers that
  // have WebKitMutationObserver but not un-prefixed MutationObserver.
  // Must use `global` instead of `window` to work in both frames and web
  // workers. `global` is a provision of Browserify, Mr, Mrs, or Mop.
  var BrowserMutationObserver = global.MutationObserver || global.WebKitMutationObserver;

  // MutationObservers are desirable because they have high priority and work
  // reliably everywhere they are implemented.
  // They are implemented in all modern browsers.
  //
  // - Android 4-4.3
  // - Chrome 26-34
  // - Firefox 14-29
  // - Internet Explorer 11
  // - iPad Safari 6-7.1
  // - iPhone Safari 7-7.1
  // - Safari 6-7
  if (typeof BrowserMutationObserver === "function") {
      requestFlush = makeRequestCallFromMutationObserver(flush);

  // MessageChannels are desirable because they give direct access to the HTML
  // task queue, are implemented in Internet Explorer 10, Safari 5.0-1, and Opera
  // 11-12, and in web workers in many engines.
  // Although message channels yield to any queued rendering and IO tasks, they
  // would be better than imposing the 4ms delay of timers.
  // However, they do not work reliably in Internet Explorer or Safari.

  // Internet Explorer 10 is the only browser that has setImmediate but does
  // not have MutationObservers.
  // Although setImmediate yields to the browser's renderer, it would be
  // preferrable to falling back to setTimeout since it does not have
  // the minimum 4ms penalty.
  // Unfortunately there appears to be a bug in Internet Explorer 10 Mobile (and
  // Desktop to a lesser extent) that renders both setImmediate and
  // MessageChannel useless for the purposes of ASAP.
  // https://github.com/kriskowal/q/issues/396

  // Timers are implemented universally.
  // We fall back to timers in workers in most engines, and in foreground
  // contexts in the following browsers.
  // However, note that even this simple case requires nuances to operate in a
  // broad spectrum of browsers.
  //
  // - Firefox 3-13
  // - Internet Explorer 6-9
  // - iPad Safari 4.3
  // - Lynx 2.8.7
  } else {
      requestFlush = makeRequestCallFromTimer(flush);
  }

  // `requestFlush` requests that the high priority event queue be flushed as
  // soon as possible.
  // This is useful to prevent an error thrown in a task from stalling the event
  // queue if the exception handled by Node.js’s
  // `process.on("uncaughtException")` or by a domain.
  rawAsap.requestFlush = requestFlush;

  // To request a high priority event, we induce a mutation observer by toggling
  // the text of a text node between "1" and "-1".
  function makeRequestCallFromMutationObserver(callback) {
      var toggle = 1;
      var observer = new BrowserMutationObserver(callback);
      var node = document.createTextNode("");
      observer.observe(node, {characterData: true});
      return function requestCall() {
          toggle = -toggle;
          node.data = toggle;
      };
  }

  // The message channel technique was discovered by Malte Ubl and was the
  // original foundation for this library.
  // http://www.nonblocking.io/2011/06/windownexttick.html

  // Safari 6.0.5 (at least) intermittently fails to create message ports on a
  // page's first load. Thankfully, this version of Safari supports
  // MutationObservers, so we don't need to fall back in that case.

  // function makeRequestCallFromMessageChannel(callback) {
  //     var channel = new MessageChannel();
  //     channel.port1.onmessage = callback;
  //     return function requestCall() {
  //         channel.port2.postMessage(0);
  //     };
  // }

  // For reasons explained above, we are also unable to use `setImmediate`
  // under any circumstances.
  // Even if we were, there is another bug in Internet Explorer 10.
  // It is not sufficient to assign `setImmediate` to `requestFlush` because
  // `setImmediate` must be called *by name* and therefore must be wrapped in a
  // closure.
  // Never forget.

  // function makeRequestCallFromSetImmediate(callback) {
  //     return function requestCall() {
  //         setImmediate(callback);
  //     };
  // }

  // Safari 6.0 has a problem where timers will get lost while the user is
  // scrolling. This problem does not impact ASAP because Safari 6.0 supports
  // mutation observers, so that implementation is used instead.
  // However, if we ever elect to use timers in Safari, the prevalent work-around
  // is to add a scroll event listener that calls for a flush.

  // `setTimeout` does not call the passed callback if the delay is less than
  // approximately 7 in web workers in Firefox 8 through 18, and sometimes not
  // even then.

  function makeRequestCallFromTimer(callback) {
      return function requestCall() {
          // We dispatch a timeout with a specified delay of 0 for engines that
          // can reliably accommodate that request. This will usually be snapped
          // to a 4 milisecond delay, but once we're flushing, there's no delay
          // between events.
          var timeoutHandle = setTimeout(handleTimer, 0);
          // However, since this timer gets frequently dropped in Firefox
          // workers, we enlist an interval handle that will try to fire
          // an event 20 times per second until it succeeds.
          var intervalHandle = setInterval(handleTimer, 50);

          function handleTimer() {
              // Whichever timer succeeds will cancel both timers and
              // execute the callback.
              clearTimeout(timeoutHandle);
              clearInterval(intervalHandle);
              callback();
          }
      };
  }

  // This is for `asap.js` only.
  // Its name will be periodically randomized to break any code that depends on
  // its existence.
  rawAsap.makeRequestCallFromTimer = makeRequestCallFromTimer;

  // ASAP was originally a nextTick shim included in Q. This was factored out
  // into this ASAP package. It was later adapted to RSVP which made further
  // amendments. These decisions, particularly to marginalize MessageChannel and
  // to capture the MutationObserver implementation in a closure, were integrated
  // back into ASAP proper.
  // https://github.com/tildeio/rsvp.js/blob/cddf7232546a9cf858524b75cde6f9edf72620a7/lib/rsvp/asap.js

  /* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 28 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var Promise = __webpack_require__(26);

  module.exports = Promise;
  Promise.prototype.done = function (onFulfilled, onRejected) {
    var self = arguments.length ? this.then.apply(this, arguments) : this;
    self.then(null, function (err) {
      setTimeout(function () {
        throw err;
      }, 0);
    });
  };


/***/ },
/* 29 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  var Promise = __webpack_require__(26);

  module.exports = Promise;
  Promise.prototype['finally'] = function (f) {
    return this.then(function (value) {
      return Promise.resolve(f()).then(function () {
        return value;
      });
    }, function (err) {
      return Promise.resolve(f()).then(function () {
        throw err;
      });
    });
  };


/***/ },
/* 30 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  //This file contains the ES6 extensions to the core Promises/A+ API

  var Promise = __webpack_require__(26);

  module.exports = Promise;

  /* Static Functions */

  var TRUE = valuePromise(true);
  var FALSE = valuePromise(false);
  var NULL = valuePromise(null);
  var UNDEFINED = valuePromise(undefined);
  var ZERO = valuePromise(0);
  var EMPTYSTRING = valuePromise('');

  function valuePromise(value) {
    var p = new Promise(Promise._99);
    p._37 = 1;
    p._12 = value;
    return p;
  }
  Promise.resolve = function (value) {
    if (value instanceof Promise) return value;

    if (value === null) return NULL;
    if (value === undefined) return UNDEFINED;
    if (value === true) return TRUE;
    if (value === false) return FALSE;
    if (value === 0) return ZERO;
    if (value === '') return EMPTYSTRING;

    if (typeof value === 'object' || typeof value === 'function') {
      try {
        var then = value.then;
        if (typeof then === 'function') {
          return new Promise(then.bind(value));
        }
      } catch (ex) {
        return new Promise(function (resolve, reject) {
          reject(ex);
        });
      }
    }
    return valuePromise(value);
  };

  Promise.all = function (arr) {
    var args = Array.prototype.slice.call(arr);

    return new Promise(function (resolve, reject) {
      if (args.length === 0) return resolve([]);
      var remaining = args.length;
      function res(i, val) {
        if (val && (typeof val === 'object' || typeof val === 'function')) {
          if (val instanceof Promise && val.then === Promise.prototype.then) {
            while (val._37 === 3) {
              val = val._12;
            }
            if (val._37 === 1) return res(i, val._12);
            if (val._37 === 2) reject(val._12);
            val.then(function (val) {
              res(i, val);
            }, reject);
            return;
          } else {
            var then = val.then;
            if (typeof then === 'function') {
              var p = new Promise(then.bind(val));
              p.then(function (val) {
                res(i, val);
              }, reject);
              return;
            }
          }
        }
        args[i] = val;
        if (--remaining === 0) {
          resolve(args);
        }
      }
      for (var i = 0; i < args.length; i++) {
        res(i, args[i]);
      }
    });
  };

  Promise.reject = function (value) {
    return new Promise(function (resolve, reject) {
      reject(value);
    });
  };

  Promise.race = function (values) {
    return new Promise(function (resolve, reject) {
      values.forEach(function(value){
        Promise.resolve(value).then(resolve, reject);
      });
    });
  };

  /* Prototype Methods */

  Promise.prototype['catch'] = function (onRejected) {
    return this.then(null, onRejected);
  };


/***/ },
/* 31 */
/***/ function(module, exports, __webpack_require__) {

  'use strict';

  // This file contains then/promise specific extensions that are only useful
  // for node.js interop

  var Promise = __webpack_require__(26);
  var asap = __webpack_require__(32);

  module.exports = Promise;

  /* Static Functions */

  Promise.denodeify = function (fn, argumentCount) {
    argumentCount = argumentCount || Infinity;
    return function () {
      var self = this;
      var args = Array.prototype.slice.call(arguments, 0,
          argumentCount > 0 ? argumentCount : 0);
      return new Promise(function (resolve, reject) {
        args.push(function (err, res) {
          if (err) reject(err);
          else resolve(res);
        })
        var res = fn.apply(self, args);
        if (res &&
          (
            typeof res === 'object' ||
            typeof res === 'function'
          ) &&
          typeof res.then === 'function'
        ) {
          resolve(res);
        }
      })
    }
  }
  Promise.nodeify = function (fn) {
    return function () {
      var args = Array.prototype.slice.call(arguments);
      var callback =
        typeof args[args.length - 1] === 'function' ? args.pop() : null;
      var ctx = this;
      try {
        return fn.apply(this, arguments).nodeify(callback, ctx);
      } catch (ex) {
        if (callback === null || typeof callback == 'undefined') {
          return new Promise(function (resolve, reject) {
            reject(ex);
          });
        } else {
          asap(function () {
            callback.call(ctx, ex);
          })
        }
      }
    }
  }

  Promise.prototype.nodeify = function (callback, ctx) {
    if (typeof callback != 'function') return this;

    this.then(function (value) {
      asap(function () {
        callback.call(ctx, null, value);
      });
    }, function (err) {
      asap(function () {
        callback.call(ctx, err);
      });
    });
  }


/***/ },
/* 32 */
/***/ function(module, exports, __webpack_require__) {

  "use strict";

  // rawAsap provides everything we need except exception management.
  var rawAsap = __webpack_require__(27);
  // RawTasks are recycled to reduce GC churn.
  var freeTasks = [];
  // We queue errors to ensure they are thrown in right order (FIFO).
  // Array-as-queue is good enough here, since we are just dealing with exceptions.
  var pendingErrors = [];
  var requestErrorThrow = rawAsap.makeRequestCallFromTimer(throwFirstError);

  function throwFirstError() {
      if (pendingErrors.length) {
          throw pendingErrors.shift();
      }
  }

  /**
   * Calls a task as soon as possible after returning, in its own event, with priority
   * over other events like animation, reflow, and repaint. An error thrown from an
   * event will not interrupt, nor even substantially slow down the processing of
   * other events, but will be rather postponed to a lower priority event.
   * @param {{call}} task A callable object, typically a function that takes no
   * arguments.
   */
  module.exports = asap;
  function asap(task) {
      var rawTask;
      if (freeTasks.length) {
          rawTask = freeTasks.pop();
      } else {
          rawTask = new RawTask();
      }
      rawTask.task = task;
      rawAsap(rawTask);
  }

  // We wrap tasks with recyclable task objects.  A task object implements
  // `call`, just like a function.
  function RawTask() {
      this.task = null;
  }

  // The sole purpose of wrapping the task is to catch the exception and recycle
  // the task object after its single use.
  RawTask.prototype.call = function () {
      try {
          this.task.call();
      } catch (error) {
          if (asap.onerror) {
              // This hook exists purely for testing purposes.
              // Its name will be periodically randomized to break any code that
              // depends on its existence.
              asap.onerror(error);
          } else {
              // In a web browser, exceptions are not fatal. However, to avoid
              // slowing down the queue of pending tasks, we rethrow the error in a
              // lower priority turn.
              pendingErrors.push(error);
              requestErrorThrow();
          }
      } finally {
          this.task = null;
          freeTasks[freeTasks.length] = this;
      }
  };


/***/ },
/* 33 */
/***/ function(module, exports, __webpack_require__) {

  var Debug = typeof window !== 'undefined' ? window.Debug : __webpack_require__(34);

  module.exports = Debug || function () {
    // empty stub when in the browser
    return function () {};
  };


/***/ },
/* 34 */
/***/ function(module, exports) {

  module.exports = __WEBPACK_EXTERNAL_MODULE_34__;

/***/ },
/* 35 */
/***/ function(module, exports, __webpack_require__) {

  var WebSocket = __webpack_require__(20);
  var Promise = __webpack_require__(23);
  var debug = __webpack_require__(33)('hypertimer:slave');
  var emitter = __webpack_require__(22);
  var stat = __webpack_require__(36);
  var util = __webpack_require__(37);

  // TODO: make these constants configurable
  var INTERVAL = 3600000; // once an hour
  var DELAY = 1000;       // delay between individual requests
  var REPEAT = 5;         // number of times to request the time for determining latency

  exports.createSlave = function (url) {
    var ws = new WebSocket(url);
    var slave = emitter(ws);
    var isFirst = true;
    var isDestroyed = false;
    var syncTimer = null;

    ws.onopen = function () {
      debug('connected');
      sync();
      syncTimer = setInterval(sync, INTERVAL);
    };

    slave.destroy = function () {
      isDestroyed = true;

      clearInterval(syncTimer);
      syncTimer = null;

      ws.close();

      debug('destroyed');
    };

    /**
     * Sync with the time of the master. Emits a 'change' message
     * @private
     */
    function sync() {
      // retrieve latency, then wait 1 sec
      function getLatencyAndWait() {
        var result = null;

        if (isDestroyed) {
          return Promise.resolve(result);
        }

        return getLatency(slave)
            .then(function (latency) { result = latency })  // store the retrieved latency
            .catch(function (err)    { console.log(err) })  // just log failed requests
            .then(function () { return util.wait(DELAY) })  // wait 1 sec
            .then(function () { return result});            // return the retrieved latency
      }

      return util
          .repeat(getLatencyAndWait, REPEAT)
          .then(function (all) {
            debug('latencies', all);

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
            return (filtered.length > 0) ? stat.mean(filtered) : null;
          })
          .then(function (latency) {
            if (isDestroyed) {
              return Promise.resolve(null);
            }
            else {
              return slave.request('time').then(function (timestamp) {
                var time = timestamp + latency;
                slave.emit('change', time);
                return time;
              });
            }
          })
          .catch(function (err) {
            slave.emit('error', err)
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



/***/ },
/* 36 */
/***/ function(module, exports) {

  // basic statistical functions

  exports.compare = function (a, b) {
    return a > b ? 1 : a < b ? -1 : 0;
  };

  exports.add = function (a, b) {
    return a + b;
  };

  exports.sum = function (arr) {
    return arr.reduce(exports.add);
  };

  exports.mean = function (arr) {
    return exports.sum(arr) / arr.length;
  };

  exports.std = function (arr) {
    return Math.sqrt(exports.variance(arr));
  };

  exports.variance = function (arr) {
    if (arr.length < 2) return 0;

    var _mean = exports.mean(arr);
    return arr
            .map(function (x) {
              return Math.pow(x - _mean, 2)
            })
            .reduce(exports.add) / (arr.length - 1);
  };

  exports.median = function (arr) {
    if (arr.length < 2) return arr[0];

    var sorted = arr.slice().sort(exports.compare);
    if (sorted.length % 2 === 0) {
      // even
      return (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
    }
    else {
      // odd
      return arr[(arr.length - 1) / 2];
    }
  };


/***/ },
/* 37 */
/***/ function(module, exports, __webpack_require__) {

  var Promise = __webpack_require__(23);

  /**
   * Resolve a promise after a delay
   * @param {number} delay    A delay in milliseconds
   * @returns {Promise} Resolves after given delay
   */
  exports.wait = function(delay) {
    return new Promise(function (resolve) {
      setTimeout(resolve, delay);
    });
  };

  /**
   * Repeat a given asynchronous function a number of times
   * @param {function} fn   A function returning a promise
   * @param {number} times
   * @return {Promise}
   */
  exports.repeat = function (fn, times) {
    return new Promise(function (resolve, reject) {
      var count = 0;
      var results = [];

      function recurse() {
        if (count < times) {
          count++;
          fn().then(function (result) {
            results.push(result);
            recurse();
          })
        }
        else {
          resolve(results);
        }
      }

      recurse();
    });
  };

  /**
   * Repeat an asynchronous callback function whilst
   * @param {function} condition   A function returning true or false
   * @param {function} callback    A callback returning a Promise
   * @returns {Promise}
   */
  exports.whilst = function (condition, callback) {
    return new Promise(function (resolve, reject) {
      function recurse() {
        if (condition()) {
          callback().then(function () {
            recurse()
          });
        }
        else {
          resolve();
        }
      }

      recurse();
    });
  };


/***/ },
/* 38 */
/***/ function(module, exports) {

  
  /* istanbul ignore else */
  if (typeof Date.now === 'function') {
    /**
     * Helper function to get the current time
     * @return {number} Current time
     */
    exports.systemNow = function () {
      return Date.now();
    }
  }
  else {
    /**
     * Helper function to get the current time
     * @return {number} Current time
     */
    exports.systemNow = function () {
      return new Date().valueOf();
    }
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
  exports.shuffle = function (o){
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
  };


/***/ }
/******/ ])
});
;