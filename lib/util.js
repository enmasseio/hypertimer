
/* istanbul ignore else */
if (typeof Date.now === 'function') {
  /**
   * Helper function to get the current time
   * @return {number} Current time
   */
  exports.nowReal = function () {
    return Date.now();
  }
}
else {
  /**
   * Helper function to get the current time
   * @return {number} Current time
   */
  exports.nowReal = function () {
    return new Date().valueOf();
  }
}

/**
 * Shuffle an array
 *
 * + Jonas Raoni Soares Silva
 * @ http://jsfromhell.com/array/shuffle [v1.0]
 *
 * @param {Array} o   Array to be shuffled
 * @returns {Array}   Returns the shuffled array
 */
exports.shuffle = function (o){
  for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
  return o;
};
