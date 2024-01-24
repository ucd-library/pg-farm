import LocalLoginServer from './local-server.js';
import init from 'multi-ini';
import {config} from './config.js';
import os from 'os';
import fs from 'fs';
import path from 'path';

class Auth {

  constructor() {
    this.PG_SERVICE_FILE = path.join(os.homedir(), '.pg_service.conf');
    this.PG_SERVICE_NAME = 'pgfarm'
  }

  login(opts) {
    opts.authUrl = config.host + config.loginPath;

    if( opts.headless ) {
      this.headlessLogin(opts);
      return;
    }

    opts.onSuccess = () => this.updateService();

    let localServer = new LocalLoginServer();
    return localServer.create(opts);
  }

  updateService() {
    let pgService = {};
    if( fs.existsSync(this.PG_SERVICE_FILE) ) {
      pgService = init.read(this.PG_SERVICE_FILE);
    }

    if( pgService[this.PG_SERVICE_NAME] ) {
      delete pgService[this.PG_SERVICE_NAME];
    }

    let hostname = new URL(config.host).hostname;

    let parts = config.token.split('.');
    let payload = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
    let username = payload.username || payload.preferred_username;

    pgService[this.PG_SERVICE_NAME] = {
      host : hostname,
      port : 5432,
      user : username,
      password : config.tokenHash
    }
    
    let fileContents = '';
    for( let key in pgService ) {
      fileContents += '['+key+']\n';
      for( let k in pgService[key] ) {
        fileContents += k+'='+pgService[key][k]+'\n';
      }
      fileContents += '\n';
    }

    fs.writeFileSync(this.PG_SERVICE_FILE, fileContents);
  }

}

const instance = new Auth();
export default instance;