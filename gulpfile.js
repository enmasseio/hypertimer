var fs = require('fs');
var gulp = require('gulp');
var gutil = require('gulp-util');
var webpack = require('webpack');
var uglify = require('uglify-js');

var ENTRY             = './index.js';
var HEADER            = './lib/header.js';
var DIST              = './dist';
var LIB_JS            = 'hypertimer.js';
var LIB_MAP           = 'hypertimer.map';
var LIB_MIN_JS        = 'hypertimer.min.js';

// generate banner with today's date and correct version
function createBanner() {
  var today = gutil.date(new Date(), 'yyyy-mm-dd'); // today, formatted as yyyy-mm-dd
  var version = require('./package.json').version;

  return String(fs.readFileSync(HEADER))
      .replace('@@date', today)
      .replace('@@version', version);
}

var bannerPlugin = new webpack.BannerPlugin(createBanner(), {
  entryOnly: true,
  raw: true
});

var webpackConfig = {
  entry: ENTRY,
  output: {
    library: 'hypertimer',
    libraryTarget: 'umd',
    path: DIST,
    filename: LIB_JS,
    sourcePrefix: '  '
  },
  module: {
    loaders: [
      {test: /\.js$/, exclude: /node_modules/, loader: 'babel-loader'}
    ]
  },
  plugins: [ bannerPlugin ],
  externals: {ws: 'ws'},
  cache: true
};

var uglifyConfig = {
  outSourceMap: LIB_MAP,
  output: {
    comments: /@license/
  }
};

// create a single instance of the compiler to allow caching
var compiler = webpack(webpackConfig);

gulp.task('bundle', function (cb) {
  // update the banner contents (has a date in it which should stay up to date)
  bannerPlugin.banner = createBanner();

  compiler.run(function (err, stats) {
    if (err) gutil.log(err);
    cb();
  });
});

gulp.task('minify', ['bundle'], function (cb) {
  var result = uglify.minify([DIST + '/' + LIB_JS], uglifyConfig);

  fs.writeFileSync(DIST + '/' + LIB_MIN_JS, result.code);
  fs.writeFileSync(DIST + '/' + LIB_MAP, result.map);

  cb();
});

// The watch task (to automatically rebuild when the source code changes)
gulp.task('watch', ['bundle', 'minify'], function () {
  gulp.watch(['index.js', 'lib/**/*'], ['bundle', 'minify']);
});

// The default task (called when you run `gulp`)
gulp.task('default', ['bundle', 'minify']);
