var assert = require('assert');
var async = require('async');
var hypertimer = require('../index');

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
      var timer = hypertimer();
      assert.deepEqual(timer.config(), {rate: 1});
    });

    it('should set configuration', function () {
      var timer = hypertimer();
      assert.equal(timer.config().rate, 1);
      timer.config({rate: 10});
      assert.equal(timer.config().rate, 10);
    });

    it('should set configuration on creation', function () {
      var timer = hypertimer({rate: 10});
      assert.equal(timer.config().rate, 10);
    });

    it('should throw an error on invalid rate', function () {
      assert.throws(function () {
        hypertimer({rate: 'bla'});
      }, /Invalid rate/);
    });

  });

  describe('run', function () {

    it('should start running by default', function () {
      var timer = hypertimer({rate: 1});
      assert.equal(timer.running(), true);
    });

    it('should test whether running', function () {
      var timer = hypertimer({rate: 1});
      assert.equal(timer.running(), true);
      timer.pause();
      assert.equal(timer.running(), false);
      timer.continue();
      assert.equal(timer.running(), true);
    });

    it('start should continue where it was left off', function (done) {
      var timer = hypertimer({rate: 1});
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

    it('should set a new time via start', function () {
      var d = new Date(2014,0,1);
      var timer = hypertimer({rate: 1});

      approx(timer.now(), new Date());

      timer.start(d);
      approx(timer.now(), d);
    });

    it('time should not change when paused', function (done) {
      var d = new Date(2014,0,1);
      var timer = hypertimer({rate: 1});

      timer.start(d);
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
        var timer = hypertimer({rate: rate});
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
      var timer = hypertimer({rate: 1});
      assert(timer.now() instanceof Date, 'must return a Date');
      approx(timer.now(), new Date());
    });

    it ('should get the current hyper-time as number', function () {
      var timer = hypertimer({rate: 1});
      assert(typeof timer.time(), 'number');
      approx(new Date(timer.time()), new Date());
    });
  });

  describe('timeout', function () {

    // TODO: test setTimeout
    // TODO: test clearTimeout
    // TODO: test setInterval
    // TODO: test clearInterval
  });

  it('should get valueOf', function () {
    var timer = new hypertimer();
    assert(timer.valueOf() instanceof Date);
    assert.equal(timer.valueOf().valueOf(), timer.now().valueOf());
  });

  it('should get toString', function () {
    var timer = new hypertimer();
    var time = timer.now();
    var str = timer.toString();

    assert.strictEqual(str, time.toString());
  });

});
