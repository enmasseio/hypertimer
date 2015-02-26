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

    // initially send the masters config
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

  function sanitizedConfig() {
    var curr = config();
    delete curr.time;
    delete curr.master;
    return curr;
  }

  function sendConfig(emitter) {
    // send current config, except for the fields master and time
    // which are not applicable for the slave. The time will be retrieved
    // later on via a separate timesync algorithm
    var curr = config();
    delete curr.time;
    delete curr.master;
    emitter.send('config', curr);
  }

  console.log('Master listening at ws://localhost:' + port);

  return master;
};
