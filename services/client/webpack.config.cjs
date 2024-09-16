const webpack = require('webpack');
const path = require('path');

let configs = require('@ucd-lib/cork-app-build').watch({
  // root directory, all paths below will be relative to root
  root : __dirname,
  entry : 'dev/elements/pgfarm-app.js',
  preview : 'dev/js',
  clientModules : ['dev/node_modules', '../../tools/node_modules'],
});

if( !Array.isArray(configs) ) configs = [configs];

// add .xml and .csl loading support
configs.forEach((config, index) => {
  config.output.publicPath = '/js/'
  config.output.chunkFilename = '[name].'+config.output.filename;

  config.resolve.alias = {
    '@ucd-lib/cork-app-utils': path.resolve(__dirname, 'dev/node_modules/@ucd-lib/cork-app-utils'),
  }

  config.resolve.fallback = {
    fs : false,
    path : false,
    os : false,
    events : require.resolve("events/")
  }

  let cssModule = config.module.rules.find(rule => {
    if( !Array.isArray(rule.use) ) return false;
    return rule.use.includes('css-loader');
  });

  let mindex = cssModule.use.indexOf('css-loader');
  cssModule.use[mindex] = {
    loader: 'css-loader',
    options: {
      url : false
    }
  }
});


module.exports = configs;