// basic statistical functions

exports.compare = function (a, b) {
  return a > b ? 1 : a < b ? -1 : 0;
};

exports.add = function (a, b) {
  return a + b;
};

exports.sum = function (arr) {
  return arr.reduce(exports.add);
};

exports.mean = function (arr) {
  return exports.sum(arr) / arr.length;
};

exports.std = function (arr) {
  return Math.sqrt(exports.variance(arr));
};

exports.variance = function (arr) {
  if (arr.length < 2) return 0;

  var _mean = exports.mean(arr);
  return arr
          .map(function (x) {
            return Math.pow(x - _mean, 2)
          })
          .reduce(exports.add) / (arr.length - 1);
};

exports.median = function (arr) {
  if (arr.length < 2) return arr[0];

  var sorted = arr.slice().sort(exports.compare);
  if (sorted.length % 2 === 0) {
    // even
    return (arr[arr.length / 2 - 1] + arr[arr.length / 2]) / 2;
  }
  else {
    // odd
    return arr[(arr.length - 1) / 2];
  }
};
