var WebSocket = require('./WebSocket');
var emitter = require('./socket-emitter');
var debug = require('../debug')('hypertimer:master');

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
    return curr;
  }

  debug('listening at ws://localhost:' + port);

  return master;
};
