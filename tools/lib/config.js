import fs from 'fs';
import path from 'path';
import os from 'os';

let config = {}

function save() {
  if( typeof window !== 'undefined' ) {
    console.warn('Cannot save config in browser');
    return;
  }

  fs.writeFileSync(
    config.configFile,
    JSON.stringify(config, null, 2)
  );
}

if( typeof window === 'undefined' ) {

  const env = process.env;


  let localFile = {};
  config.configFilePath = env.PGFARM_CONF_FILE || '.pg-farm.json';
  if( !path.isAbsolute(config.configFilePath ) ) {
    config.configFilePath  = path.join(os.homedir(), config.configFilePath );
  }

  if( fs.existsSync(config.configFilePath ) ) {
    localFile = JSON.parse(fs.readFileSync(config.configFilePath , 'utf8'));
    config.token = localFile.token;
    config.tokenHash = localFile.tokenHash;
    config.host = env.PGFARM_HOST || localFile.host || 'http://localhost:3000',
    config.loginPath = env.PGFARM_LOGIN_PATH || localFile.loginPath || '/login'
  }

} else {
  config = window.APP_CONFIG || {};
  config.host = '/';
  config.loginPath = config.loginPath || '/login';
  config.logoutPath = config.logoutPath || '/auth/logout';
}


export {
  save,
  config
};
