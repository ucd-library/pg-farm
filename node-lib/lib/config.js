const path = require('path');
const os = require('os');
const fs = require('fs-extra');

// default config
let config = {
  rootDir : '/opt/pg-farm'
}

let externalConfigFile = '';
if( fs.existsSync('/etc/pg-farm/conf') ) {
  externalConfigFile = fs.existsSync('/etc/pg-farm/.conf');
}

let userConfigFile = ''
if( fs.existsSync(path.join(os.homedir(), '.pg-farm')) ) {
  userConfigFile = path.join(os.homedir(), '.pg-farm');
}

let userConfig = userConfigFile ? JSON.parse(fs.readFileSync(userConfigFile, 'utf-8')) : {};
let externalConfig = externalConfigFile ? JSON.parse(fs.readFileSync(externalConfigFile, 'utf-8')) : {};

config = Object.assign(config, externalConfig, userConfig);
config.externalConfigFile = externalConfigFile;
config.userConfigFile = userConfigFile;

if( process.argv.includes('--root-dir') ) {
  config.rootDir = process.argv[process.argv.indexOf('--root-dir')+1];
} else if( process.env['PG_FARM_ROOT'] ) {
  config.rootDir = process.env['PG_FARM_ROOT']
} 

if( !fs.existsSync(path.join(config.rootDir, 'config.json')) ) {
  console.error(`Unknown farm location: ${path.resolve(config.rootDir, 'config.json')} not found.`);
  process.exit(-1);
}

config.assign = opts => {
  for( let key in opts ) {
    config[toCamelCase(key)] = opts[key];
  }
}

function toCamelCase(str) {
  return str.replace(/-([a-z])/g, function (g) { return g[1].toUpperCase(); });
}

module.exports = config;