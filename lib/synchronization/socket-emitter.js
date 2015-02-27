// Turn a WebSocket in an event emitter.
var eventEmitter = require('event-emitter');
var Promise = require('./../Promise');
var debug = require('../debug')('hypertimer:socket');

var TIMEOUT = 60000; // ms
// TODO: make timeout a configuration setting

module.exports = function (socket) {
  var emitter = eventEmitter({
    socket: socket,
    send: send,
    request: request
  });

  /**
   * Send an event
   * @param {string} event
   * @param {*} data
   */
  function send (event, data) {
    var envelope = {
      event: event,
      data: data
    };
    debug('send', envelope);
    socket.send(JSON.stringify(envelope));
  }

  /**
   * Request an event, await a response
   * @param {string} event
   * @param {*} data
   * @return {Promise} Returns a promise which resolves with the reply
   */
  function request (event, data) {
    return new Promise(function (resolve, reject) {
      // put the data in an envelope with id
      var id = getId();
      var envelope = {
        event: event,
        id: id,
        data: data
      };

      // add the request to the list with requests in progress
      queue[id] = {
        resolve: resolve,
        reject: reject,
        timeout: setTimeout(function () {
          delete queue[id];
          reject(new Error('Timeout'));
        }, TIMEOUT)
      };

      socket.send(JSON.stringify(envelope));
    });
  }

  /**
   * Event handler, handles incoming messages
   * @param {Object} event
   */
  socket.onmessage = function (event) {
    var data = event.data;
    var envelope = JSON.parse(data);
    debug('receive', envelope);

    // match the request from the id in the response
    var request = queue[envelope.id];
    if (request) {
      // incoming response
      clearTimeout(request.timeout);
      delete queue[envelope.id];
      request.resolve(envelope.data);
    }
    else if ('id' in envelope) {
      // incoming request
      emitter.emit(envelope.event, envelope.data, function (reply) {
        var response = {
          id: envelope.id,
          data: reply
        };
        debug('reply', response);
        socket.open && socket.send(JSON.stringify(response));
      });
    }
    else {
      // regular incoming message
      emitter.emit(envelope.event, envelope.data);
    }
  };

  var queue = {};   // queue with requests in progress

  // get a unique id (simple counter)
  function getId () {
    return _id++;
  }
  var _id = 0;

  return emitter;
};
