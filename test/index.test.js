var assert = require('assert');
var index = require('../index');

describe('index', function () {

  it('should create a new hypertimer', function () {
    var timer = index();
    assert.equal(typeof timer.now, 'function');
    assert.equal(typeof timer.setTimeout, 'function');
    assert.equal(typeof timer.setInterval, 'function');
  });

});