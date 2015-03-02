var assert = require('assert');
var freeport = require('freeport');
var hypertimer = require('../index');

describe('synchronization', function () {

  it('should synchronize configuration with a master', function (done) {
    freeport(function (err, port) {
      var master = hypertimer({port: port, rate: 2});

      var slave = hypertimer({master: 'ws://localhost:' + port});
      slave.on('config', function (config) {
        assert.deepEqual(config, {
          paced: true,
          rate: 2,
          deterministic: true,
          time: null,
          port: null,  // should not be sent from the master
          master: 'ws://localhost:' + port
        });
        slave.destroy();
        master.destroy();
        done();
      });

    }, 1000);
  });

  // TODO: extensively test synchronization

});