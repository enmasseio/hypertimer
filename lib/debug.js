var Debug = typeof window !== 'undefined' ? window.Debug : require('debug');

module.exports = Debug || function () {
  // empty stub when in the browser
  return function () {};
};
