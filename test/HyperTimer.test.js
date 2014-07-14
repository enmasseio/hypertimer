var assert = require('assert');
var async = require('async');
var HyperTimer = require('../lib/HyperTimer');

/**
 * Assert whether two dates are approximately equal.
 * Throws an assertion error when the dates are not approximately equal.
 * @param {Date} date1
 * @param {Date} date2
 * @param {Number} [epsilon=10]  maximum difference in milliseconds
 */
function approx(date1, date2, epsilon) {
  assert(Math.abs(date1 - date2) < (epsilon === undefined ? 10 : epsilon),
      date1.toISOString() + ' ~= ' + date2.toISOString());
}

describe('approx', function () {
  it ('should compare two dates', function () {
    var a = new Date();
    var b = new Date(a.valueOf() + 0);
    var c = new Date(a.valueOf() + 20);
    var d = new Date(a.valueOf() + 200);
    approx(a, b);
    assert.throws(function() {approx(a, c)});
    approx(a, c, 100);
    assert.throws(function() {approx(a, d, 100)});
  });
});

describe('hypertimer', function () {

  describe('config', function () {

    it('should get configuration', function () {
      var timer = new HyperTimer();
      assert.deepEqual(timer.config(), {rate: 1});
    });

    it('should set configuration', function () {
      var timer = new HyperTimer();
      assert.equal(timer.config().rate, 1);
      timer.config({rate: 10});
      assert.equal(timer.config().rate, 10);
    });

    it('should set configuration on creation', function () {
      var timer = new HyperTimer({rate: 10});
      assert.equal(timer.config().rate, 10);
    });

    it('should throw an error on invalid rate', function () {
      assert.throws(function () {
        new HyperTimer({rate: 'bla'});
      }, /TypeError: Rate must be a number/);
    });

  });

  describe('run', function () {

    it('should start running by default', function () {
      var timer = new HyperTimer({rate: 1});
      assert.equal(timer.running, true);
    });

    // TODO: test whether set(time) throws an error in case of invalid type of time

    it('should test whether running', function () {
      var timer = new HyperTimer({rate: 1});
      assert.equal(timer.running, true);
      timer.pause();
      assert.equal(timer.running, false);
      timer.continue();
      assert.equal(timer.running, true);
    });

    it('start should continue where it was left off', function (done) {
      var timer = new HyperTimer({rate: 1});
      timer.pause();

      var a = timer.now();
      approx(timer.now(), new Date());

      setTimeout(function () {
        timer.continue(); // continue
        approx(timer.now(), a);

        setTimeout(function () {
          approx(timer.now(), new Date(a.valueOf() + 100));
          done();
        }, 100);
      }, 100);
    });

    it('should set a new time via set', function () {
      var d = new Date(2014,0,1);
      var timer = new HyperTimer({rate: 1});

      approx(timer.now(), new Date());

      timer.set(d);
      approx(timer.now(), d);
    });

    it('time should not change when paused', function (done) {
      var d = new Date(2014,0,1);
      var timer = new HyperTimer({rate: 1});

      timer.set(d);
      approx(timer.now(), d);

      timer.pause();
      approx(timer.now(), d);

      setTimeout(function () {
        approx(timer.now(), d);
        done();
      }, 100);
    });

    it('should run hyper-time with the configured rate', function (done) {
      // To keep the test fast, don't see a rate too large, else you have to
      // increase the delay to compensate for possible round-off errors and
      // inaccuracy of the real-time.
      var rates = [1, 2, 1/2, -1, -2, 0];
      var epsilon = 20;

      async.map(rates, function (rate, cb) {
        var timer = new HyperTimer({rate: rate});
        var started = new Date();
        approx(timer.now(), started);

        var delay = 200;
        setTimeout(function () {
          approx(timer.now(), new Date(started.valueOf() + delay * rate), epsilon);
          cb();
        }, delay);
      }, done);
    });

  });

  describe('now', function () {
    it ('should get the current hyper-time as Date', function () {
      var timer = new HyperTimer({rate: 1});
      assert(timer.now() instanceof Date, 'must return a Date');
      approx(timer.now(), new Date());
    });

    it ('should get the current hyper-time as number', function () {
      var timer = new HyperTimer({rate: 1});
      assert(typeof timer.get(), 'number');
      approx(new Date(timer.get()), new Date());
    });
  });

  describe('timeout', function () {

    it('should set a timeout with rate=1', function (done) {
      var timer = new HyperTimer({rate: 1});
      var start = new Date();

      var delay = 100;
      timer.setTimeout(function () {
        approx(new Date(), new Date(start.valueOf() + 100));
        done();
      }, 100);
    });

    it('should set a timeout with rate=2', function (done) {
      var timer = new HyperTimer({rate: 2});
      var start = new Date();

      timer.setTimeout(function () {
        approx(new Date(), new Date(start.valueOf() + 100));
        done();
      }, 200);
    });

    it('should set a timeout with rate=1/2', function (done) {
      var timer = new HyperTimer({rate: 1/2});
      var start = new Date();

      timer.setTimeout(function () {
        approx(new Date(), new Date(start.valueOf() + 200));
        done();
      }, 100);
    });

    it('should set a timeout with a delay in the past', function (done) {
      var timer = new HyperTimer({rate: 1});
      var start = new Date();

      timer.setTimeout(function () {
        approx(new Date(), start);
        done();
      }, -10);
    });

    it('should set a timeout with an infinite delay', function (done) {
      var timer = new HyperTimer({rate: 1});
      var start = new Date();

      timer.setTimeout(function () {
        approx(new Date(), start);
        done();
      }, Infinity);
    });

    it('should set a timeout with a date', function (done) {
      var timer = new HyperTimer({rate: 2});
      var start = new Date(2014,0,1,12,0,0,0);
      var end   = new Date(2014,0,1,12,0,0,200);

      timer.set(start);

      var a = new Date();
      timer.setTimeout(function () {
        approx(new Date(), new Date(a.valueOf() + 100));
        done();
      }, end);
    });

    it('should set a timeout with a date in the past', function (done) {
      var timer = new HyperTimer({rate: 2});
      var start = new Date(2014,0,1,12,0,0,0);
      var end   = new Date(2014,0,1,11,0,0,0);

      timer.set(start);

      var a = new Date();
      timer.setTimeout(function () {
        approx(new Date(), a);
        done();
      }, end);
    });

    it.skip('should pause a timeout when the timer is paused', function () {
      // TODO
    });

    it.skip('should adjust a timeout when the timers time is adjusted', function () {
      // TODO
    });

    // TODO: test setTimeout
    // TODO: test clearTimeout
    // TODO: test setInterval
    // TODO: test clearInterval
  });

  // TODO: test with a numeric time instead of Dates, timer.set(0), rate='discrete', and timeouts like timer.timeout(cb, 1)

  it('should get valueOf', function () {
    var timer = new HyperTimer();
    assert(timer.valueOf() instanceof Date);
    assert.equal(timer.valueOf().valueOf(), timer.now().valueOf());
  });

  it('should get toString', function () {
    var timer = new HyperTimer();
    assert.strictEqual(typeof timer.toString(), 'string');
    assert.strictEqual(timer.toString().toString(), timer.now().toString());
  });

  it('should throw an error when called without new operator', function () {
    assert.throws(function () {HyperTimer({rate: 1})}, /new operator/);
  });

});
