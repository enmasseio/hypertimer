// NOTE: all timeouts should have time differences of at least 50ms to be
//       safely distinguishably
var assert = require('assert');
var async = require('async');
var seed = require('seed-random');
var hypertimer = require('../index');

// TODO: split hypertimer.test.js in separate files, it has grown too large

/**
 * Assert whether two dates are approximately equal.
 * Throws an assertion error when the dates are not approximately equal.
 * @param {Date} date1
 * @param {Date} date2
 * @param {Number} [epsilon=25]  maximum difference in milliseconds
 */
function approx(date1, date2, epsilon) {
  assert(Math.abs(date1 - date2) < (epsilon === undefined ? 25 : epsilon),
      (date1 && date1.toISOString()) + ' ~= ' + (date2 && date2.toISOString()));
}

describe('approx', function () {
  it ('should compare two dates', function () {
    var a = new Date();
    var b = new Date(a.valueOf() + 0);
    var c = new Date(a.valueOf() + 30);
    var d = new Date(a.valueOf() + 300);
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
      assert.deepEqual(timer.config(), {paced: true, rate: 1, deterministic: true, time: null, master: null});

      var timer2 = hypertimer({paced: false, rate: 2, deterministic: false, time: 2524651200000});
      assert.deepEqual(timer2.config(), {paced: false, rate: 2, deterministic: false, time: '2050-01-01T12:00:00.000Z', master: null});
    });

    it('should set configuration', function () {
      var timer = hypertimer();
      assert.equal(timer.config().rate, 1);
      timer.config({rate: 10});
      assert.equal(timer.config().rate, 10);
    });

    it('should set empty configuration', function () {
      var timer = hypertimer();
      assert.equal(timer.config().rate, 1);
      timer.config({});
      assert.equal(timer.config().rate, 1);
    });

    it('should set configuration on creation', function () {
      var timer = hypertimer({rate: 10});
      assert.equal(timer.config().rate, 10);
    });

    it('should update configuration', function () {
      var timer = hypertimer({rate: 1});
      timer.config({time: new Date(2050,0,1,12,0,0,0)});
      approx(timer.getTime(), new Date(2050,0,1,12,0,0,0));

      timer.config({rate: 10});
      assert.equal(timer.config().rate, 10);
      approx(timer.getTime(), new Date(2050,0,1,12,0,0,0));
    });

    it('should throw an error on invalid rate', function () {
      assert.throws(function () {
        hypertimer({rate: 'bla'});
      }, /TypeError: Invalid rate "bla". Rate must be a positive number/);
    });

  });

  describe('get/set time', function () {
    it ('should set the current hyper-time from a Date', function () {
      var timer = hypertimer({
        rate: 1,
        time: new Date(2050, 0, 1)
      });
      approx(timer.getTime(), new Date(2050, 0, 1));
    });

    it ('should set the current hyper-time from a number', function () {
      var timer = hypertimer({
        rate: 1,
        time: new Date(2050, 0, 1).valueOf()
      });
      approx(timer.getTime(), new Date(2050, 0, 1));
    });

    it ('should set the current hyper-time from an ISO string', function () {
      var time = '2050-01-01T12:00:00.000Z';
      var timer = hypertimer({
        rate: 1,
        time: time
      });
      approx(timer.getTime(), new Date(time));
    });

    it ('should throw an error in case of invalid variable', function () {
      var timer = hypertimer({rate: 1});
      assert.throws(function () {timer.config({time:'bla'})}, /Invalid date "bla". Date, number, or ISOString expected/);
      assert.throws(function () {timer.config({time:{}})}, /Invalid date \{}. Date, number, or ISOString expected/);
    });

    it ('should get the current hyper-time as Date', function () {
      var timer = hypertimer({rate: 1});
      assert(timer.getTime() instanceof Date, 'must return a Date');
      approx(timer.getTime(), new Date());
    });

    it ('should get the current hyper-time as number', function () {
      var timer = hypertimer({rate: 1});
      assert(typeof timer.now(), 'number');
      approx(new Date(timer.now()), new Date());
    });
  });

  describe('run', function () {

    it('should start running by default', function () {
      var timer = hypertimer({rate: 1});
      assert.equal(timer.running, true);
    });

    it('should test whether running', function () {
      var timer = hypertimer({rate: 1});
      assert.equal(timer.running, true);
      timer.pause();
      assert.equal(timer.running, false);
      timer.continue();
      assert.equal(timer.running, true);
    });

    it('start should continue where it was left off', function (done) {
      var timer = hypertimer({rate: 1});
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
      var d = new Date(2050,0,1);
      var timer = hypertimer({rate: 1});

      approx(timer.getTime(), new Date());

      timer.config({time: d});
      approx(timer.getTime(), d);
    });

    it('time should not change when paused', function (done) {
      var d = new Date(2050,0,1);
      var timer = hypertimer({rate: 1});

      timer.config({time: d});
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
      var rates = [1, 2, 4, 1/2];
      var epsilon = 20;

      async.map(rates, function (rate, cb) {
        var timer = hypertimer({rate: rate});
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
      var timer = hypertimer({rate: 1});
      var start = new Date();

      timer.setTimeout(function () {
        approx(new Date(), new Date(start.valueOf() + 100));
        done();
      }, 100);
    });

    it('should set a timeout with rate=2', function (done) {
      var timer = hypertimer({rate: 2});
      var start = new Date();

      timer.setTimeout(function () {
        approx(new Date(), new Date(start.valueOf() + 100));
        done();
      }, 200);
    });

    it('should set a timeout with rate=1/2', function (done) {
      var timer = hypertimer({rate: 1/2});
      var start = new Date();

      timer.setTimeout(function () {
        approx(new Date(), new Date(start.valueOf() + 200));
        done();
      }, 100);
    });

    it('should set a timeout with a delay in the past', function (done) {
      var timer = hypertimer({rate: 1});
      var start = new Date();

      timer.setTimeout(function () {
        approx(new Date(), start);
        done();
      }, -10);
    });

    it('should set a timeout with an infinite delay', function (done) {
      var timer = hypertimer({rate: 1});
      var start = new Date();

      timer.setTimeout(function () {
        approx(new Date(), start);
        done();
      }, Infinity);
    });

    it('should continue scheduling when the first timeout is cancelled', function (done) {
      var timer = hypertimer({rate: 1});
      var start = new Date();

      var t1 = timer.setTimeout(function () {
        done(new Error('Should not trigger cancelled error'))
      }, 100);
      var t2 = timer.setTimeout(function () {
        approx(new Date(), new Date(start.valueOf() + 150));
        done();
      }, 150);

      // t1 is now scheduled as first next timeout
      timer.clearTimeout(t1);
      // t2 should now be scheduled as first next timeout
    });

    it('should execute multiple timeouts in the right order', function (done) {
      var timer = hypertimer({rate: 1/2});
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
      var timer = hypertimer({
        rate: 1/2,
        time: new Date(2050,0,1,12,0,0,0)
      });

      var start = new Date();
      var log = [];

      timer.setTimeout(function () {
        assert.deepEqual(log, ['A', 'B']);

        approx(new Date(), new Date(start.valueOf() + 400));
        approx(timer.getTime(), new Date(2050,0,1,12,0,0,100));
        done();
      }, 100);

      // real-time timeout
      setTimeout(function () {
        log.push('A');

        timer.pause();
        approx(timer.getTime(), new Date(2050,0,1,12,0,0,50));
        approx(new Date(), new Date(start.valueOf() + 100));

        setTimeout(function () {
          log.push('B');
          timer.continue();
          approx(timer.getTime(), new Date(2050,0,1,12,0,0,50));
          approx(new Date(), new Date(start.valueOf() + 300));
        }, 200);
      }, 100);
    });

    it('should adjust a timeout when the timers time is adjusted', function (done) {
      var timer = hypertimer({
        rate: 1,
        time: new Date(2050,0,1,12,0,0,0)
      });
      var start = new Date();

      timer.setTimeout(function () {
        approx(new Date(), new Date(start.valueOf() + 100));
        approx(timer.getTime(), new Date(2050,0,1,12,0,0,200));
        done();
      }, 200);

      timer.config({time: new Date(2050,0,1,12,0,0,100)});
    });

    it('should adjust a timeout when the timers rate is adjusted', function (done) {
      var timer = hypertimer({
        rate: 1/2,
        time: new Date(2050,0,1,12,0,0,0)
      });
      var start = new Date();
      var log = [];

      timer.setTimeout(function () {
        assert.deepEqual(log, ['A']);
        approx(new Date(), new Date(start.valueOf() + 150));
        approx(timer.getTime(), new Date(2050,0,1,12,0,0,100));
        done();
      }, 100);

      setTimeout(function () {
        approx(timer.getTime(), new Date(2050,0,1,12,0,0,50));

        timer.config({rate: 1});

        approx(timer.getTime(), new Date(2050,0,1,12,0,0,50));
        log.push('A');
      }, 100)
    });

    it('should cancel a timeout with clearTimeout', function (done) {
      var timer = hypertimer({
        rate: 1,
        time: new Date(2050,0,1,12,0,0,0)
      });
      var log = [];

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

    it('should be able to use setTimout from a different context', function (done) {
      var timer = hypertimer({rate: 1/2});
      var start = new Date();

      var mySetTimeout = timer.setTimeout;

      mySetTimeout(function () {
        approx(new Date(), new Date(start.valueOf() + 200));
        done();
      }, 100);
    });

  });

  describe('trigger', function () {

    it('should set a trigger with rate=1', function (done) {
      var timer = hypertimer({rate: 1});
      var start = new Date();
      var time = new Date(new Date().valueOf() + 100);

      timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 100));
        done();
      }, time);
    });

    it('should set a trigger with rate=2', function (done) {
      var timer = hypertimer({rate: 2});
      var start = new Date();
      var time = new Date(new Date().valueOf() + 200);

      timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 100));
        done();
      }, time);
    });

    it('should set a trigger with rate=1/2', function (done) {
      var timer = hypertimer({rate: 1/2});
      var start = new Date();
      var time = new Date(new Date().valueOf() + 100);

      timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 200));
        done();
      }, time);
    });

    it('should set a trigger with a time in the past', function (done) {
      var timer = hypertimer({rate: 1});
      var start = new Date();
      var time = new Date(new Date().valueOf() - 100);

      timer.setTrigger(function () {
        approx(new Date(), start);
        done();
      }, time);
    });

    it('should set a trigger with a number as time', function (done) {
      var timer = hypertimer({rate: 1});
      var start = new Date();
      var time = new Date().valueOf() + 100;

      timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 100));
        done();
      }, time);
    });

    it('should set a trigger with a number in the past as time', function (done) {
      var timer = hypertimer({rate: 1});
      var start = new Date();
      var time = new Date().valueOf() - 100;

      timer.setTrigger(function () {
        approx(new Date(), start);
        done();
      }, time);
    });

    it('should set a trigger with an infinite number as time', function (done) {
      var timer = hypertimer({rate: 1});
      var start = new Date();
      var time = Infinity;

      timer.setTrigger(function () {
        approx(new Date(), start);
        done();
      }, time);
    });

    it('should set a trigger with a start and end', function (done) {
      var start = new Date(2050,0,1,12,0,0,0);
      var end   = new Date(2050,0,1,12,0,0,200);

      var timer = hypertimer({rate: 2, time: start});

      var a = new Date();
      timer.setTrigger(function () {
        approx(new Date(), new Date(a.valueOf() + 100));
        done();
      }, end);
    });

    it('should set a trigger with a start and an end in the past', function (done) {
      var start = new Date(2050,0,1,12,0,0,0);
      var end   = new Date(2050,0,1,11,0,0,0);

      var timer = hypertimer({rate: 2, time: start});

      var a = new Date();
      timer.setTrigger(function () {
        approx(new Date(), a);
        done();
      }, end);
    });

    it('should execute multiple triggers in the right order', function (done) {
      var start = new Date();
      var log = [];

      var timer = hypertimer({
        rate: 1/2,
        time: new Date(2050,0,1,12,0,0,0)
      });

      var triggerB = timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 200));

        log.push('B');
        assert.deepEqual(log, ['A', 'B']);
      }, new Date(2050,0,1,12,0,0,100));

      var triggerC = timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 300));

        log.push('C');
        assert.deepEqual(log, ['A', 'B', 'C']);

        done();
      }, new Date(2050,0,1,12,0,0,150));

      var triggerA = timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 100));

        log.push('A');
        assert.deepEqual(log, ['A']);
      }, new Date(2050,0,1,12,0,0,50));

      assert.deepEqual(timer.list(), [triggerA, triggerB, triggerC]);
    });

    it('should pause a trigger when the timer is paused', function (done) {
      var timer = hypertimer({
        rate: 1/2,
        time: new Date(2050,0,1,12,0,0,0)
      });
      var start = new Date();
      var log = [];

      timer.setTrigger(function () {
        assert.deepEqual(log, ['A', 'B']);

        approx(new Date(), new Date(start.valueOf() + 400));
        approx(timer.getTime(), new Date(2050,0,1,12,0,0,100));
        done();
      }, new Date(2050,0,1,12,0,0,100));

      // real-time timeout
      setTimeout(function () {
        log.push('A');

        timer.pause();
        approx(timer.getTime(), new Date(2050,0,1,12,0,0,50));
        approx(new Date(), new Date(start.valueOf() + 100));

        setTimeout(function () {
          log.push('B');
          timer.continue();
          approx(timer.getTime(), new Date(2050,0,1,12,0,0,50));
          approx(new Date(), new Date(start.valueOf() + 300));
        }, 200);
      }, 100);
    });

    it('should adjust a trigger when the timers time is adjusted', function (done) {
      var timer = hypertimer({
        rate: 1,
        time: new Date(2050,0,1,12,0,0,0)
      });
      var start = new Date();

      timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 100));
        approx(timer.getTime(), new Date(2050,0,1,12,0,0,200));
        done();
      }, new Date(2050,0,1,12,0,0,200));

      timer.config({time: new Date(2050,0,1,12,0,0,100)});
    });

    it('should adjust a trigger when the timers rate is adjusted', function (done) {
      var timer = hypertimer({
        rate: 1/2,
        time: new Date(2050,0,1,12,0,0,0)
      });
      var start = new Date();
      var log = [];

      timer.setTrigger(function () {
        assert.deepEqual(log, ['A']);
        approx(new Date(), new Date(start.valueOf() + 150));
        approx(timer.getTime(), new Date(2050,0,1,12,0,0,100));
        done();
      }, new Date(2050,0,1,12,0,0,100));

      setTimeout(function () {
        approx(timer.getTime(), new Date(2050,0,1,12,0,0,50));

        timer.config({rate: 1});

        approx(timer.getTime(), new Date(2050,0,1,12,0,0,50));
        log.push('A');
      }, 100)
    });

    it('should cancel a trigger with clearTrigger', function (done) {
      var timer = hypertimer({
        rate: 1,
        time: new Date(2050,0,1,12,0,0,0)
      });
      var log = [];

      var trigger1 = timer.setTrigger(function () {
        log.push('1');
      }, new Date(2050,0,1,12,0,0,100));

      var trigger2 = timer.setTrigger(function () {
        log.push('2');
        assert(false, 'should not trigger trigger1')
      }, new Date(2050,0,1,12,0,0,150));

      var trigger3 = timer.setTrigger(function () {
        log.push('3');
      }, new Date(2050,0,1,12,0,0,200));

      setTimeout(function () {
        timer.clearTrigger(trigger2);
      }, 50);

      setTimeout(function () {
        assert.deepEqual(log, ['1', '3']);
        done();
      }, 250)
    });
  });

  describe('interval', function () {
    it('should set an interval', function (done) {
      var timer = hypertimer({rate: 1/2});
      var start = new Date();

      var occurrence = 0;
      var interval = timer.setInterval(function () {
        occurrence++;
        approx(new Date(), new Date(start.valueOf() + occurrence * 100));
        approx(timer.getTime(), new Date(start.valueOf() + occurrence * 50));
        if (occurrence == 3) {
          timer.clearInterval(interval);
          assert.deepEqual(timer.list(), []);
          done();
        }
      }, 50);
    });

    it('should adjust an interval when the timers time is adjusted into the future', function (done) {
      var logs = [];
      var timer = hypertimer({time: '2050-01-01T12:00:00.000Z'});

      timer.setInterval(function () {
        logs.push(timer.getTime())
      }, 100);

      // jump ~10 sec in the future
      setTimeout(function () {
        timer.config({time: '2050-01-01T12:00:10.050Z'});
      }, 250);

      setTimeout(function () {
        approx(logs[0], new Date('2050-01-01T12:00:00.100Z'));
        approx(logs[1], new Date('2050-01-01T12:00:00.200Z'));
        approx(logs[2], new Date('2050-01-01T12:00:10.100Z'));
        assert.equal(logs.length, 3);

        done();
      }, 350);

    });

    it('should adjust an interval when the timers time is adjusted into the past', function (done) {
      var logs = [];
      var timer = hypertimer({time: '2050-01-01T12:00:00.000Z'});

      timer.setInterval(function () {
        logs.push(timer.getTime())
      }, 100);

      // jump ~10 sec in the past
      setTimeout(function () {
        timer.config({time: '2050-01-01T11:00:50.050Z'});
      }, 250);

      setTimeout(function () {
        approx(logs[0], new Date('2050-01-01T12:00:00.100Z'));
        approx(logs[1], new Date('2050-01-01T12:00:00.200Z'));
        approx(logs[2], new Date('2050-01-01T11:00:50.100Z'));
        assert.equal(logs.length, 3);

        done();
      }, 350);

    });

    it('should set an interval with firstTime', function (done) {
      var timer = hypertimer({
        rate: 1,
        time: new Date(2050,0,1,12,0,0,0)
      });
      var start = new Date();

      var firstTime = new Date(2050,0,1,12,0,0,300);
      var occurrence = 0;
      var interval = timer.setInterval(function () {
        occurrence++;
        approx(new Date(), new Date(start.valueOf() + 300 + (occurrence - 1) * 100));
        approx(timer.getTime(), new Date(firstTime.valueOf() + (occurrence - 1) * 100));
        if (occurrence == 3) {
          timer.clearInterval(interval);
          assert.deepEqual(timer.list(), []);
          done();
        }
      }, 100, firstTime);
    });

    it('should set an interval with a number as firstTime', function (done) {
      var timer = hypertimer({
        rate: 1,
        time: new Date(2050,0,1,12,0,0,0)
      });
      var start = new Date();

      var firstTime = new Date(2050,0,1,12,0,0,300);
      var occurrence = 0;
      var interval = timer.setInterval(function () {
        occurrence++;
        approx(new Date(), new Date(start.valueOf() + 300 + (occurrence - 1) * 100));
        approx(timer.getTime(), new Date(firstTime.valueOf() + (occurrence - 1) * 100));
        if (occurrence == 4) {
          timer.clearInterval(interval);
          assert.deepEqual(timer.list(), []);
          done();
        }
      }, 100, firstTime);
    });

    it('should set an interval with a firstTime in the past', function (done) {
      var timer = hypertimer({time: '2050-01-01T12:00:00Z'});

      var occurrence = 0;
      var interval = timer.setInterval(function () {
        try {
          occurrence++;

          if (occurrence == 1) approx(timer.getTime(), new Date('2050-01-01T12:00:00.000Z'));
          if (occurrence == 2) approx(timer.getTime(), new Date('2050-01-01T12:00:00.100Z'));
          if (occurrence == 3) approx(timer.getTime(), new Date('2050-01-01T12:00:00.200Z'));

          if (occurrence == 3) {
            timer.clearInterval(interval);
            assert.deepEqual(timer.list(), []);
            done();
          }
        }
        catch (err) {
          timer.clearInterval(interval);
          done(err);
        }
      }, 100, '2015-01-01');
    });

    it('should clear an interval using clearInterval', function (done) {
      var timer = hypertimer({rate: 1});

      var interval = timer.setInterval(function () {
        assert(false, 'should not trigger interval')
      }, 50);

      timer.clearInterval(interval);
      assert.deepEqual(timer.list(), []);

      // wait until the time where the interval should have been triggered
      setTimeout(function () {
        done();
      }, 150);
    });

    it('should clear an interval using clearInterval inside the intervals callback', function (done) {
      var timer = hypertimer({rate: 1});

      var counter = 0;
      var interval = timer.setInterval(function () {
        timer.clearInterval(interval);
        assert.deepEqual(timer.list(), []);

        counter++;
      }, 50);


      // wait until the time where the interval should have been triggered
      setTimeout(function () {
        assert.equal(counter, 1);
        done();
      }, 150);
    });

    it('should clear an interval using clear', function (done) {
      var timer = hypertimer({rate: 1});

      timer.setInterval(function () {
        assert(false, 'should not trigger interval')
      }, 50);

      timer.clear();
      assert.deepEqual(timer.list(), []);

      // wait until the time where the interval should have been triggered
      setTimeout(function () {
        done();
      }, 150);
    });

    it('should clear an interval using clear inside the intervals callback', function (done) {
      var timer = hypertimer({rate: 1});

      var counter = 0;
      timer.setInterval(function () {
        timer.clear();
        assert.deepEqual(timer.list(), []);

        counter++;
      }, 50);

      // wait until the time where the interval should have been triggered
      setTimeout(function () {
        assert.equal(counter, 1);
        done();
      }, 200);
    });

    it('should set a negative interval', function (done) {
      var timer = hypertimer({rate: 1});
      var start = new Date();

      var occurrence = 0;
      var interval = timer.setInterval(function () {
        occurrence++;
        approx(new Date(), start);
        approx(timer.getTime(), start);
        if (occurrence == 4) {
          timer.clearInterval(interval);
          assert.deepEqual(timer.list(), []);
          done();
        }
      }, -100);
    });

    it('should set a negative interval with firstTime', function (done) {
      var timerStart = new Date(2050,0,1,12,0,0,0);
      var realStart = new Date(new Date().valueOf() + 200);
      var firstStart = new Date(2050,0,1,12,0,0,200);

      var timer = hypertimer({rate: 1, time: timerStart});

      var occurrence = 0;
      var interval = timer.setInterval(function () {
        occurrence++;
        approx(new Date(), realStart);
        approx(timer.getTime(), firstStart);
        if (occurrence == 4) {
          timer.clearInterval(interval);
          assert.deepEqual(timer.list(), []);
          done();
        }
      }, -100, firstStart);
    });

    it('should set an infinite interval', function (done) {
      var timer = hypertimer({rate: 1});
      var start = new Date();

      var occurrence = 0;
      var interval = timer.setInterval(function () {
        occurrence++;
        approx(new Date(), start);
        approx(timer.getTime(), start);
        if (occurrence == 4) {
          timer.clearInterval(interval);
          assert.deepEqual(timer.list(), []);
          done();
        }
      }, Infinity);
    });

    it('should correctly update interval when a timeout in the past is inserted', function (done) {
      var timer = hypertimer({rate: 1});
      var start = new Date();
      var logs = [];

      var first = true;
      timer.setInterval(function () {
        try {
          logs.push('A');
          if (first) {
            first = false;
            approx(new Date(), new Date(start.valueOf() + 100));
            approx(timer.getTime(), new Date(start.valueOf() + 100));

            timer.setTrigger(function () {
              logs.push('B');
              approx(new Date(), new Date(start.valueOf() + 100));
              approx(timer.getTime(), new Date(start.valueOf() + 100));
            }, new Date(start.valueOf() -100));
          }
          else {
            assert.deepEqual(logs, ['A', 'B', 'A']);
            approx(new Date(), new Date(start.valueOf() + 200));
            approx(timer.getTime(), new Date(start.valueOf() + 200));

            timer.clear();
            done();
          }
        }
        catch(err) {
          done(err);
        }
      }, 100);
    });

    it('should correctly update interval when rate changes', function (done) {
      var timer = hypertimer({
        rate: 1,
        time: new Date(2050,0,1, 12,0,0, 0)
      });
      var start = new Date();

      var plans = {
        '1': {realTime: new Date(start.valueOf() + 100), hyperTime: new Date(2050,0,1, 12,0,0, 100), newRate: 2},
        '2': {realTime: new Date(start.valueOf() + 150), hyperTime: new Date(2050,0,1, 12,0,0, 200), newRate: 1/2},
        '3': {realTime: new Date(start.valueOf() + 350), hyperTime: new Date(2050,0,1, 12,0,0, 300), newRate: 1},
        '4': {realTime: new Date(start.valueOf() + 450), hyperTime: new Date(2050,0,1, 12,0,0, 400)}
      };

      var occurrence = 0;
      timer.setInterval(function () {
        occurrence++;
        var plan = plans[occurrence];
        try {
          approx(timer.getTime(), plan.hyperTime);
          approx(new Date(), plan.realTime);
        }
        catch (err) {
          done(err);
        }

        if ('newRate' in plan) {
          timer.config({rate: plan.newRate});
        }
        if (!plans[occurrence + 1]) {
          timer.clear();
          done();
        }
      }, 100);
    });
  });

  describe('discrete events', function () {

    it('should run a series of discrete events', function (done) {
      var timer = hypertimer({
        paced: false,
        time: new Date(2050,0,1, 12,0,0, 0)
      });
      var start = new Date();
      var logs = [];

      timer.setTimeout(function () {
        logs.push('A');
        try {
          var time = timer.getTime();
          assert.deepEqual(time, new Date(2050,0,1, 12,0,1));
        }
        catch (err) {
          done(err);
        }

        timer.setTimeout(function () {
          logs.push('B');
          try {
            assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,3));
          }
          catch(err) {
            done(err)
          }
        }, 2000);

        timer.setTimeout(function () {
          logs.push('C');
          try {
            assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,2));
          }
          catch (err) {
            done(err);
          }

          timer.setTimeout(function () {
            logs.push('E');
            try {
              assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,3));

              assert.deepEqual(logs, ['A', 'C', 'D', 'B', 'E']);
              approx(new Date(), start);

              done();
            }
            catch (err) {
              done(err);
            }
          }, 1000);

        }, 1000);

        timer.setTimeout(function () {
          logs.push('D');
          try {
            assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,2));
          }
          catch (err) {
            done(err);
          }
        }, 1000);

      }, 1000);

    });

    it('should run an async timeout as discrete event', function (testDone) {
      var timer = hypertimer({
        paced: false,
        time: new Date(2050,0,1, 12,0,0, 0)
      });

      timer.setTimeout(function (done) {
        try {
          assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,5));
        }
        catch (err) {
          done(err);
        }

        // here we do an async action inside a timeout's callback
        setTimeout(function () {
          timer.setTimeout(function () {
            try {
              assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,10));
            }
            catch (err) {
              testDone(err);
            }

            testDone();
          }, 5000);

          // we are done now with the first timeout
          done();
        }, 100);

      }, 5000);
    });

    it('should add timeouts in an async timeout in deterministic order', function (testDone) {
      // The real-time delay for creation of timeout C is larger than that for creating timeout D,
      // so the test would fail if A and B where executed in parallel
      var timer = hypertimer({
        paced: false,
        time: new Date(2050,0,1, 12,0,0, 0)
      });

      var logs = [];

      timer.setTimeout(function (done) {
        logs.push('A');
        assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,5));

        setTimeout(function () {
          timer.setTimeout(function () {
            logs.push('C');
            assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,10));
          }, 5000);

          done();
        }, 100);

      }, 5000);

      timer.setTimeout(function (done) {
        logs.push('B');
        assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,5));

        // here we do an async action inside a timeout's callback
        setTimeout(function () {
          timer.setTimeout(function () {
            logs.push('D');
            try {
              assert.deepEqual(logs, ['A', 'B', 'C', 'D']);
              assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,10));
              testDone();
            }
            catch (err) {
              testDone(err);
            }
          }, 5000);

          done();
        }, 50);

      }, 5000);
    });

    it('should handle adding a new setTimeout when all timeouts are finished', function (done) {
      var timer = hypertimer({
        paced: false,
        time: new Date(2050,0,1, 12,0,0, 0)
      });
      var logs = [];

      timer.setTimeout(function () {
        logs.push('A');

        assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,10));
      }, 10000);

      setTimeout(function () {
        timer.setTimeout(function () {
          logs.push('B');

          assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,20));
          assert.deepEqual(logs, ['A', 'B']);

          done();
        }, 10000)

      }, 50)
    });

    it('should handle adding a new setTrigger when all timeouts are finished', function (done) {
      var timer = hypertimer({
        paced: false,
        time: new Date(2050,0,1, 12,0,0, 0)
      });
      var logs = [];

      timer.setTrigger(function () {
        logs.push('A');

        assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,10));
      }, new Date(2050,0,1, 12,0,10));

      setTimeout(function () {
        timer.setTrigger(function () {
          logs.push('B');

          assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,20));
          assert.deepEqual(logs, ['A', 'B']);

          done();
        }, new Date(2050,0,1, 12,0,20))

      }, 50)
    });

    it('should handle adding a new setTimeout in the past', function (done) {
      var timer = hypertimer({
        paced: false,
        time: new Date(2050,0,1, 12,0,0, 0)
      });

      timer.setTimeout(function () {
        assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,0));

        done()
      }, -10000);
    });

    it('should handle adding a new setTimeout with infinite delay', function (done) {
      var timer = hypertimer({
        paced: false,
        time: new Date(2050,0,1, 12,0,0, 0)
      });

      timer.setTimeout(function () {
        assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,0));

        done()
      }, Infinity);
    });

    it('should handle adding a new setTrigger in the past', function (done) {
      var timer = hypertimer({
        paced: false,
        time: new Date(2050,0,1, 12,0,0, 0)
      });

      timer.setTrigger(function () {
        assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,0));

        done()
      }, new Date(2050,0,1, 11,0,0));
    });

    it('should handle adding a new setTrigger with infinite value', function (done) {
      var timer = hypertimer({
        paced: false,
        time: new Date(2050,0,1, 12,0,0, 0)
      });

      timer.setTrigger(function () {
        assert.deepEqual(timer.getTime(), new Date(2050,0,1, 12,0,0));

        done()
      }, Infinity);
    });

  });

  describe('determinism', function () {
    var originalRandom;

    before(function () {
      // replace the original Math.random with a reproducible one
      // FIXME: for util.shuffle, we should replace Math.random with a reproducible one but this seems not to work.
      originalRandom = Math.random;
      Math.random = seed('key');
    });

    after(function () {
      // restore the original random function
      Math.random = originalRandom;
    });

    it('configure deterministic option', function () {
      var timer = hypertimer({deterministic: true});
      assert.equal(timer.config().deterministic, true);

      timer.config({deterministic: false});
      assert.equal(timer.config().deterministic, false);

      timer.config({deterministic: true});
      assert.equal(timer.config().deterministic, true);
    });

    it('should execute timeouts in deterministic order', function (done) {
      var timer = hypertimer({paced: false, deterministic: true});

      var ids = [];
      var logs = [];
      for (var i = 0; i < 1000; i++) {
        (function () {
          var id = timer.setTimeout(function () {
            logs.push(id);
          }, 1000);
          ids.push(id);
        })();
      }

      timer.setTimeout(function () {
        // the timeouts should have been executed in the order they where added
        assert.deepEqual(ids, logs);

        done();
      }, 2000);
    });

    it('should execute timeouts in non-deterministic order', function (done) {
      var timer = hypertimer({paced: false, deterministic: false});

      var ids = [];
      var logs = [];
      for (var i = 0; i < 1000; i++) {
        (function () {
          var id = timer.setTimeout(function () {
            logs.push(id);
          }, 1000);
          ids.push(id);
        })();
      }

      timer.setTimeout(function () {
        // the timeouts should have been executed in the order they where added
        assert.notDeepEqual(ids, logs);

        done();
      }, 2000);
    });

    it('should handle deep synchronous nesting', function (done) {
      var timer = hypertimer({paced: false});

      timer.setTimeout(function () {
        timer.setTrigger(function () {
          timer.setTimeout(function () {
            timer.setTrigger(function () {
              done();
            }, timer.now() + 50)
          }, 50)
        }, timer.now() + 50)
      },50)
    })
  });

  describe('sync', function () {
    it('should handle deep synchronous nesting', function (done) {
      var timer = hypertimer();

      timer.setTimeout(function () {
        timer.setTrigger(function () {
          timer.setTimeout(function () {
            timer.setTrigger(function () {
              done();
            }, timer.now() + 50)
          }, 50)
        }, timer.now() + 50)
      },50)
    })
  });

  // TODO: test with a numeric time instead of "real" Dates, timer.config({time: 0}), paced: false, and timeouts like timer.timeout(cb, 1)

  it('should get valueOf', function () {
    var timer = hypertimer();
    assert(timer.valueOf() instanceof Date);
    approx(timer.valueOf(), timer.getTime());
  });

  it('should get toString', function () {
    var timer = hypertimer();
    assert.strictEqual(typeof timer.toString(), 'string');
    assert.strictEqual(timer.toString().toString(), timer.getTime().toString());
  });

  it('should list all timeouts', function (done) {
    var timer = hypertimer({rate: 1});

    var id1 = timer.setTimeout(function () {}, 1000);
    var id2 = timer.setTimeout(function () {}, 50);
    var id3 = timer.setTrigger(function () {}, new Date(Date.now() + 100));

    assert.deepEqual(timer.list(), [id2, id3, id1]);

    timer.clearTimeout(id2);
    assert.deepEqual(timer.list(), [id3, id1]);

    setTimeout(function () {
      assert.deepEqual(timer.list(), [id1]);
      timer.clearTimeout(id1);

      assert.deepEqual(timer.list(), []);
      done();
    }, 150);
  });

  it('should clear all timeouts', function () {
    var timer = hypertimer({rate: 1});

    var id1 = timer.setTimeout(function () {}, 1000);
    var id2 = timer.setTimeout(function () {}, 50);
    var id3 = timer.setTrigger(function () {}, new Date(Date.now() + 100));

    assert.deepEqual(timer.list(), [id2, id3, id1]);

    timer.clear();
    assert.deepEqual(timer.list(), []);
  });

  describe('events', function () {
    // note: the `config` event is tested for in synchronization.test.js

    it('should emit an error event', function (done) {
      var timer = hypertimer();

      timer.on('error', function (err) {
        assert.equal(err.toString(), 'ReferenceError: a is not defined');
        done();
      });

      timer.setTimeout(function() {
        a + 2; // will throw an ReferenceError : a is not defined
      }, 0);
    });

  });

  // TODO: should test master/slave

});
