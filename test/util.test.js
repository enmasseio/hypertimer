var assert = require('assert');
var util = require('../lib/util');

describe('util', function () {

  it('should get current time', function () {
    assert(Math.abs(util.systemNow() - new Date().valueOf()) < 10);
  });
});