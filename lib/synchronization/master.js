var WebSocket = require('./WebSocket');
var emitterify = require('../emitterify');

exports.createMaster = function (now, config, port) {
  var WebSocketServer = WebSocket.Server;
  var master = new WebSocketServer({port: port});

  master.on('connection', function (ws) {
    var emitter = emitterify(ws);

    // ping timesync messages (for the timesync module)
    emitter.on('time', function (data, callback) {
      callback(now());
    });

    // send the masters config to the new connection
    emitter.send('config', sanitizedConfig());

    ws.emitter = emitter; // used by broadcast
  });

  master.broadcast = function (event, data) {
    master.clients.forEach(function (client) {
      client.emitter.send(event, data);
    });
  };

  master.broadcastConfig = function () {
    master.broadcast('config', sanitizedConfig());
  };

  master.destroy = function() {
    master.close();
  };

  function sanitizedConfig() {
    var curr = config();
    delete curr.time;
    delete curr.master;
    return curr;
  }

  console.log('Master listening at ws://localhost:' + port);

  return master;
};
