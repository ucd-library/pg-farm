import fs from 'fs';
import path from 'path';
import os from 'os';

const env = process.env;

let localFile = {};
let configFilePath = env.PGFARM_CONF_FILE || '.pg-farm.json';
if( !path.isAbsolute(configFilePath) ) {
  configFilePath = path.join(os.homedir(), configFilePath);
}

if( fs.existsSync(configFilePath) ) {
  localFile = JSON.parse(fs.readFileSync(configFilePath, 'utf8'));
}

const config = {
  host : env.PGFARM_HOST || localFile.host || 'http://localhost:3000',
  loginPath : env.PGFARM_LOGIN_PATH || localFile.loginPath || '/login',
  configFile : configFilePath,
  token : localFile.token || null
}

function save() {
  fs.writeFileSync(
    config.configFile, 
    JSON.stringify(config, null, 2)
  );
}

export {
  save, 
  config
};