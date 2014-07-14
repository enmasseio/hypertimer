var assert = require('assert');
var hypertimer = require('../index');
var HyperTimer = require('../lib/HyperTimer');

describe('index', function () {

  it('should create a new HyperTimer', function () {
    var timer = hypertimer();
    assert(timer instanceof HyperTimer);
  });

  it('should create a new HyperTimer with options', function () {
    var timer = hypertimer({rate: 10});
    assert(timer instanceof HyperTimer);
    assert.equal(timer.rate, 10);
  });

});