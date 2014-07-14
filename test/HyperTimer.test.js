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

    it('should set empty configuration', function () {
      var timer = new HyperTimer();
      assert.equal(timer.config().rate, 1);
      timer.config({});
      assert.equal(timer.config().rate, 1);
    });

    it('should set configuration on creation', function () {
      var timer = new HyperTimer({rate: 10});
      assert.equal(timer.config().rate, 10);
    });

    it('should update configuration', function () {
      var timer = new HyperTimer({rate: 1});
      timer.setTime(new Date(2014,0,1,12,0,0,0));
      approx(timer.getTime(), new Date(2014,0,1,12,0,0,0));

      timer.config({rate: 10});
      assert.equal(timer.config().rate, 10);
      approx(timer.getTime(), new Date(2014,0,1,12,0,0,0));
    });

    it('should throw an error on invalid rate', function () {
      assert.throws(function () {
        new HyperTimer({rate: 'bla'});
      }, /TypeError: Rate must be a number/);
    });

  });

  describe('get/set time', function () {
    it ('should set the current hyper-time from a Date', function () {
      var timer = new HyperTimer({rate: 1});
      timer.setTime(new Date(2014, 0, 1));
      approx(timer.getTime(), new Date(2014, 0, 1));
    });

    it ('should set the current hyper-time from a number', function () {
      var timer = new HyperTimer({rate: 1});
      timer.setTime(new Date(2014, 0, 1).valueOf());
      approx(timer.getTime(), new Date(2014, 0, 1));
    });

    it ('should throw an error in case of invalid variable', function () {
      var timer = new HyperTimer({rate: 1});
      assert.throws(function () {timer.setTime('bla')}, /Time must be a Date or number/);
      assert.throws(function () {timer.setTime({})}, /Time must be a Date or number/);
    });

    it ('should get the current hyper-time as Date', function () {
      var timer = new HyperTimer({rate: 1});
      assert(timer.getTime() instanceof Date, 'must return a Date');
      approx(timer.getTime(), new Date());
    });

    it ('should get the current hyper-time as number', function () {
      var timer = new HyperTimer({rate: 1});
      assert(typeof timer.now(), 'number');
      approx(new Date(timer.now()), new Date());
    });
  });

  describe('run', function () {

    it('should start running by default', function () {
      var timer = new HyperTimer({rate: 1});
      assert.equal(timer.running, true);
    });

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

      var a = timer.getTime();
      approx(timer.getTime(), new Date());

      setTimeout(function () {
        timer.continue(); // continue
        approx(timer.getTime(), a);

        setTimeout(function () {
          approx(timer.getTime(), new Date(a.valueOf() + 100));
          done();
        }, 100);
      }, 100);
    });

    it('should set a new time via set', function () {
      var d = new Date(2014,0,1);
      var timer = new HyperTimer({rate: 1});

      approx(timer.getTime(), new Date());

      timer.setTime(d);
      approx(timer.getTime(), d);
    });

    it('time should not change when paused', function (done) {
      var d = new Date(2014,0,1);
      var timer = new HyperTimer({rate: 1});

      timer.setTime(d);
      approx(timer.getTime(), d);

      timer.pause();
      approx(timer.getTime(), d);

      setTimeout(function () {
        approx(timer.getTime(), d);
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
        approx(timer.getTime(), started);

        var delay = 200;
        setTimeout(function () {
          approx(timer.getTime(), new Date(started.valueOf() + delay * rate), epsilon);
          cb();
        }, delay);
      }, done);
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

    it('should execute multiple timeouts in the right order', function (done) {
      var timer = new HyperTimer({rate: 1/2});
      var start = new Date();
      var log = [];

      timer.setTimeout(function () {
        approx(new Date(), new Date(start.valueOf() + 200));

        log.push('B');
        assert.deepEqual(log, ['A', 'B']);
      }, 100);

      timer.setTimeout(function () {
        approx(new Date(), new Date(start.valueOf() + 300));

        log.push('C');
        assert.deepEqual(log, ['A', 'B', 'C']);

        done();
      }, 150);

      timer.setTimeout(function () {
        approx(new Date(), new Date(start.valueOf() + 100));

        log.push('A');
        assert.deepEqual(log, ['A']);
      }, 50);
    });

    it('should pause a timeout when the timer is paused', function (done) {
      var timer = new HyperTimer({rate: 1/2});
      timer.setTime(new Date(2014,0,1,12,0,0,0));
      var start = new Date();
      var log = [];

      timer.setTimeout(function () {
        assert.deepEqual(log, ['A', 'B']);

        approx(new Date(), new Date(start.valueOf() + 400));
        approx(timer.getTime(), new Date(2014,0,1,12,0,0,100));
        done();
      }, 100);

      // real-time timeout
      setTimeout(function () {
        log.push('A');

        timer.pause();
        approx(timer.getTime(), new Date(2014,0,1,12,0,0,50));
        approx(new Date(), new Date(start.valueOf() + 100));

        setTimeout(function () {
          log.push('B');
          timer.continue();
          approx(timer.getTime(), new Date(2014,0,1,12,0,0,50));
          approx(new Date(), new Date(start.valueOf() + 300));
        }, 200);
      }, 100);
    });

    it('should adjust a timeout when the timers time is adjusted', function (done) {
      var timer = new HyperTimer({rate: 1});
      var start = new Date();

      timer.setTime(new Date(2014,0,1,12,0,0,0));

      timer.setTimeout(function () {
        approx(new Date(), new Date(start.valueOf() + 100));
        approx(timer.getTime(), new Date(2014,0,1,12,0,0,200));
        done();
      }, 200);

      timer.setTime(new Date(2014,0,1,12,0,0,100));
    });

    it('should adjust a timeout when the timers rate is adjusted', function (done) {
      var timer = new HyperTimer({rate: 1/2});
      var start = new Date();
      var log = [];

      timer.setTime(new Date(2014,0,1,12,0,0,0));

      timer.setTimeout(function () {
        assert.deepEqual(log, ['A']);
        approx(new Date(), new Date(start.valueOf() + 150));
        approx(timer.getTime(), new Date(2014,0,1,12,0,0,100));
        done();
      }, 100);

      setTimeout(function () {
        approx(timer.getTime(), new Date(2014,0,1,12,0,0,50));

        timer.config({rate: 1});

        approx(timer.getTime(), new Date(2014,0,1,12,0,0,50));
        log.push('A');
      }, 100)
    });

    it('should cancel a timeout with clearTimeout', function (done) {
      var timer = new HyperTimer({rate: 1});
      var log = [];

      timer.setTime(new Date(2014,0,1,12,0,0,0));

      var timeout1 = timer.setTimeout(function () {
        log.push('1');
      }, 100);

      var timeout2 = timer.setTimeout(function () {
        log.push('2');
        assert(false, 'should not trigger timeout1')
      }, 150);

      var timeout3 = timer.setTimeout(function () {
        log.push('3');
      }, 200);

      setTimeout(function () {
        timer.clearTimeout(timeout2);
      }, 50);

      setTimeout(function () {
        assert.deepEqual(log, ['1', '3']);
        done();
      }, 250)
    });
  });

  describe.skip('trigger', function () {

    it('should set a trigger with rate=1', function (done) {
      var timer = new HyperTimer({rate: 1});
      var start = new Date();
      var time = new Date(new Date().valueOf() + 100);

      timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 100));
        done();
      }, time);
    });

    it('should set a trigger with rate=2', function (done) {
      var timer = new HyperTimer({rate: 2});
      var start = new Date();
      var time = new Date(new Date().valueOf() + 200);

      timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 100));
        done();
      }, time);
    });

    it('should set a trigger with rate=1/2', function (done) {
      var timer = new HyperTimer({rate: 1/2});
      var start = new Date();
      var time = new Date(new Date().valueOf() + 100);

      timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 200));
        done();
      }, time);
    });

    it('should set a trigger with a time in the past', function (done) {
      var timer = new HyperTimer({rate: 1});
      var start = new Date();
      var time = new Date(new Date().valueOf() - 100);

      timer.setTrigger(function () {
        approx(new Date(), start);
        done();
      }, time);
    });

    // TODO: should execute multiple triggers in the right order

    // TODO: test setTrigger with number as input

    it('should set a trigger with a start and end', function (done) {
      var timer = new HyperTimer({rate: 2});
      var start = new Date(2014,0,1,12,0,0,0);
      var end   = new Date(2014,0,1,12,0,0,200);

      timer.setTime(start);

      var a = new Date();
      timer.setTrigger(function () {
        approx(new Date(), new Date(a.valueOf() + 100));
        done();
      }, end);
    });

    it('should set a trigger with a start and an end in the past', function (done) {
      var timer = new HyperTimer({rate: 2});
      var start = new Date(2014,0,1,12,0,0,0);
      var end   = new Date(2014,0,1,11,0,0,0);

      timer.setTime(start);

      var a = new Date();
      timer.setTrigger(function () {
        approx(new Date(), a);
        done();
      }, end);
    });

    it.skip('should pause a trigger when the timer is paused', function () {
      // TODO
    });

    it.skip('should adjust a trigger when the timers time is adjusted', function () {
      // TODO
    });

    // TODO: test clearTrigger
  });

  describe('interval', function () {
    // TODO: test setInterval
    // TODO: test clearInterval
  });

  // TODO: test with a numeric time instead of Dates, timer.setTime(0), rate='discrete', and timeouts like timer.timeout(cb, 1)

  it('should get valueOf', function () {
    var timer = new HyperTimer();
    assert(timer.valueOf() instanceof Date);
    assert.equal(timer.valueOf().valueOf(), timer.getTime().valueOf());
  });

  it('should get toString', function () {
    var timer = new HyperTimer();
    assert.strictEqual(typeof timer.toString(), 'string');
    assert.strictEqual(timer.toString().toString(), timer.getTime().toString());
  });

  it('should throw an error when called without new operator', function () {
    assert.throws(function () {HyperTimer({rate: 1})}, /new operator/);
  });

});
