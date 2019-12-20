const fs = require('fs');
const path = require('path');
const os = require('os');

const defaults = {
  rootDir : '/opt/pg-farm'
}

module.exports = (opts={}) => {
  let tmp = {};
  for( let key in opts ) {
    tmp[toCamelCase(key)] = opts[key];
  }
  opts = tmp;

  let configFile = opts.configFile;
  if( !configFile ) {
    configFile = path.join(os.homedir(), '.pg-farm')
  }

  if( !fs.existsSync(configFile) ) {
    configFile = path.join('etc', 'pg-farm', 'setup.json')
  }

  let fileOpts = {};
  if( fs.existsSync(configFile) ) {
    fileOpts = JSON.parse(fs.readFileSync(configFile, 'utf-8'));
  }

  return Object.assign({}, defaults, fileOpts, opts);
}


function toCamelCase(str) {
  return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}