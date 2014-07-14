
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
