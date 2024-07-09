const webpack = require('webpack');

let configs = require('@ucd-lib/cork-app-build').watch({
  // root directory, all paths below will be relative to root
  root : __dirname,
  entry : 'dev/elements/pgfarm-app.js',
  preview : 'dev/js',
  clientModules : 'dev/node_modules'
});

if( !Array.isArray(configs) ) configs = [configs];

// add .xml and .csl loading support
configs.forEach((config, index) => {
  config.output.publicPath = '/js/'
  config.output.chunkFilename = '[name].'+config.output.filename;

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

  console.log('cssModule', cssModule)
});


module.exports = configs;