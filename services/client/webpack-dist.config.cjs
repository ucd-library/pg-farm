const webpack = require('webpack');

let configs = require('@ucd-lib/cork-app-build').dist({
  // root directory, all paths below will be relative to root
  root : __dirname,
  entry : 'dev/elements/pgfarm-app.js',
  // folder where bundle.js will be written
  dist : 'dist/js',
  preview : 'dev/js',
  clientModules : 'dev/node_modules'
});

if( !Array.isArray(configs) ) configs = [configs];

configs.forEach((config, index) => {
  config.output.publicPath = '/js/'
  config.output.chunkFilename = '[name]-[chunkhash].'+config.output.filename;
});

module.exports = configs;