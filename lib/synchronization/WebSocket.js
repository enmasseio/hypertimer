module.exports = (typeof window === 'undefined' || typeof window.WebSocket === 'undefined') ?
    require('ws') :
    window.WebSocket;
