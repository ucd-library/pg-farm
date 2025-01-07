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
  host : env.PGFARM_HOST || localFile.host || 'https://pgfarm.library.ucdavis.edu',
  loginPath : env.PGFARM_LOGIN_PATH || localFile.loginPath || '/login',
  configFile : configFilePath,
  token : localFile.token || null,
  tokenHash : localFile.tokenHash || null
}

if( !fs.existsSync(configFilePath) ) {
  save();
}

function save() {
  let tmp = Object.assign({}, config);
  delete tmp.configFile;

  fs.writeFileSync(
    configFilePath, 
    JSON.stringify(tmp, null, 2)
  );
}

function getParsedToken() {
  let payload = config.token ? config.token.split('.')[1] : null;
  if( !payload ) return null;
  
  try {
    let token = JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
    token.expires = new Date(token.exp * 1000);
    token.expiresDays = ((token.expires.getTime() - Date.now()) / (1000*60*60*24)).toFixed(1);
    return token;
  } catch(e) {}

  return null;
}

export {
  save, 
  config,
  getParsedToken
};