// NOTE: all timeouts should have time differences of at least 50ms to be
//       safely distinguishably
var assert = require('assert');
var async = require('async');
var hypertimer = require('../lib/hypertimer');

/**
 * Assert whether two dates are approximately equal.
 * Throws an assertion error when the dates are not approximately equal.
 * @param {Date} date1
 * @param {Date} date2
 * @param {Number} [epsilon=25]  maximum difference in milliseconds
 */
function approx(date1, date2, epsilon) {
  assert(Math.abs(date1 - date2) < (epsilon === undefined ? 25 : epsilon),
      date1.toISOString() + ' ~= ' + date2.toISOString());
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
      assert.deepEqual(timer.config(), {rate: 1});
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
      timer.setTime(new Date(2014,0,1,12,0,0,0));
      approx(timer.getTime(), new Date(2014,0,1,12,0,0,0));

      timer.config({rate: 10});
      assert.equal(timer.config().rate, 10);
      approx(timer.getTime(), new Date(2014,0,1,12,0,0,0));
    });

    it('should throw an error on invalid rate', function () {
      assert.throws(function () {
        hypertimer({rate: 'bla'});
      }, /TypeError: rate must be a number/);
    });

  });

  describe('get/set time', function () {
    it ('should set the current hyper-time from a Date', function () {
      var timer = hypertimer({rate: 1});
      timer.setTime(new Date(2014, 0, 1));
      approx(timer.getTime(), new Date(2014, 0, 1));
    });

    it ('should set the current hyper-time from a number', function () {
      var timer = hypertimer({rate: 1});
      timer.setTime(new Date(2014, 0, 1).valueOf());
      approx(timer.getTime(), new Date(2014, 0, 1));
    });

    it ('should throw an error in case of invalid variable', function () {
      var timer = hypertimer({rate: 1});
      assert.throws(function () {timer.setTime('bla')}, /time must be a Date or number/);
      assert.throws(function () {timer.setTime({})}, /time must be a Date or number/);
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
      var d = new Date(2014,0,1);
      var timer = hypertimer({rate: 1});

      approx(timer.getTime(), new Date());

      timer.setTime(d);
      approx(timer.getTime(), d);
    });

    it('time should not change when paused', function (done) {
      var d = new Date(2014,0,1);
      var timer = hypertimer({rate: 1});

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
      var timer = hypertimer({rate: 1/2});
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
      var timer = hypertimer({rate: 1});
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
      var timer = hypertimer({rate: 1/2});
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
      var timer = hypertimer({rate: 1});
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
      var timer = hypertimer({rate: 2});
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
      var timer = hypertimer({rate: 2});
      var start = new Date(2014,0,1,12,0,0,0);
      var end   = new Date(2014,0,1,11,0,0,0);

      timer.setTime(start);

      var a = new Date();
      timer.setTrigger(function () {
        approx(new Date(), a);
        done();
      }, end);
    });

    it('should execute multiple triggers in the right order', function (done) {
      var timer = hypertimer({rate: 1/2});
      var start = new Date();
      var log = [];

      timer.setTime(new Date(2014,0,1,12,0,0,0));

      var triggerB = timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 200));

        log.push('B');
        assert.deepEqual(log, ['A', 'B']);
      }, new Date(2014,0,1,12,0,0,100));

      var triggerC = timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 300));

        log.push('C');
        assert.deepEqual(log, ['A', 'B', 'C']);

        done();
      }, new Date(2014,0,1,12,0,0,150));

      var triggerA = timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 100));

        log.push('A');
        assert.deepEqual(log, ['A']);
      }, new Date(2014,0,1,12,0,0,50));

      assert.deepEqual(timer.list(), [triggerA, triggerB, triggerC]);
    });

    it('should pause a trigger when the timer is paused', function (done) {
      var timer = hypertimer({rate: 1/2});
      timer.setTime(new Date(2014,0,1,12,0,0,0));
      var start = new Date();
      var log = [];

      timer.setTrigger(function () {
        assert.deepEqual(log, ['A', 'B']);

        approx(new Date(), new Date(start.valueOf() + 400));
        approx(timer.getTime(), new Date(2014,0,1,12,0,0,100));
        done();
      }, new Date(2014,0,1,12,0,0,100));

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

    it('should adjust a trigger when the timers time is adjusted', function (done) {
      var timer = hypertimer({rate: 1});
      var start = new Date();

      timer.setTime(new Date(2014,0,1,12,0,0,0));

      timer.setTrigger(function () {
        approx(new Date(), new Date(start.valueOf() + 100));
        approx(timer.getTime(), new Date(2014,0,1,12,0,0,200));
        done();
      }, new Date(2014,0,1,12,0,0,200));

      timer.setTime(new Date(2014,0,1,12,0,0,100));
    });

    it('should adjust a trigger when the timers rate is adjusted', function (done) {
      var timer = hypertimer({rate: 1/2});
      var start = new Date();
      var log = [];

      timer.setTime(new Date(2014,0,1,12,0,0,0));

      timer.setTrigger(function () {
        assert.deepEqual(log, ['A']);
        approx(new Date(), new Date(start.valueOf() + 150));
        approx(timer.getTime(), new Date(2014,0,1,12,0,0,100));
        done();
      }, new Date(2014,0,1,12,0,0,100));

      setTimeout(function () {
        approx(timer.getTime(), new Date(2014,0,1,12,0,0,50));

        timer.config({rate: 1});

        approx(timer.getTime(), new Date(2014,0,1,12,0,0,50));
        log.push('A');
      }, 100)
    });

    it('should cancel a trigger with clearTrigger', function (done) {
      var timer = hypertimer({rate: 1});
      var log = [];

      timer.setTime(new Date(2014,0,1,12,0,0,0));

      var trigger1 = timer.setTrigger(function () {
        log.push('1');
      }, new Date(2014,0,1,12,0,0,100));

      var trigger2 = timer.setTrigger(function () {
        log.push('2');
        assert(false, 'should not trigger trigger1')
      }, new Date(2014,0,1,12,0,0,150));

      var trigger3 = timer.setTrigger(function () {
        log.push('3');
      }, new Date(2014,0,1,12,0,0,200));

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

    it('should set an interval with firstTime', function (done) {
      var timer = hypertimer({rate: 1});
      var start = new Date();

      timer.setTime(new Date(2014,0,1,12,0,0,0));

      var firstTime = new Date(2014,0,1,12,0,0,300);
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
      var timer = hypertimer({rate: 1});
      var start = new Date();

      timer.setTime(new Date(2014,0,1,12,0,0,0));

      var firstTime = new Date(2014,0,1,12,0,0,300);
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
      }, 100, firstTime.valueOf());
    });

    it('should clear an interval', function (done) {
      var timer = hypertimer({rate: 1});

      var interval = timer.setInterval(function () {
        assert(false, 'should not trigger interval')
      }, 100);

      timer.clearInterval(interval);
      assert.deepEqual(timer.list(), []);

      // wait until the time where the interval should have been triggered
      setTimeout(function () {
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
      var timer = hypertimer({rate: 1});
      var timerStart = new Date(2014,0,1,12,0,0,0);
      var realStart = new Date(new Date().valueOf() + 200);
      var firstStart = new Date(2014,0,1,12,0,0,200);

      timer.setTime(timerStart);

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
  });

  // TODO: test with a numeric time instead of "real" Dates, timer.setTime(0), rate='discrete', and timeouts like timer.timeout(cb, 1)

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

});
