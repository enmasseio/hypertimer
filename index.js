var HyperTimer = require('./lib/HyperTimer');

/**
 * Create a HyperTimer
 * @param {Object} [options]  The following options are available:
 *                            rate: Number The rate of speed of hyper time with
 *                                         respect to real-time in milliseconds
 *                                         per millisecond. By default, rate
 *                                         is 1. Note that rate can even be a
 *                                         negative number.
 * @returns {HyperTimer}
 */
module.exports = function (options) {
  return new HyperTimer(options);
};
