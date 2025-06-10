import LocalLoginServer from './local-server.js';
import init from 'multi-ini';
import {config, save as saveConfig} from './config.js';
import os from 'os';
import fs from 'fs';
import path from 'path';
import fetch from 'node-fetch';
import crypto from 'crypto';

class Auth {

  constructor() {
    this.PG_SERVICE_FILE = path.join(os.homedir(), '.pg_service.conf');
    this.PG_FARM_PEM = path.join(os.homedir(), '.pgfarm.pem');
    this.PG_SERVICE_NAME = 'pgfarm'

    this.ROOT_SYSTEM_CERT = 'system';
    this.ROOT_CERT = this.PG_FARM_PEM;
    if ( (config.host || '').includes('localhost') ) {
      this.ROOT_CERT = this.ROOT_SYSTEM_CERT;
    }
  }

  login(opts) {
    opts.authUrl = config.host + config.loginPath;

    if( opts.forceSystemCert ) {
      this.ROOT_CERT = this.ROOT_SYSTEM_CERT;
    }

    if( opts.headless ) {
      this.headlessLogin(opts);
      return;
    }

    opts.onSuccess = () => this.updateService();

    let localServer = new LocalLoginServer();
    return localServer.create(opts);
  }

  logout() {
    config.token = "";
    config.tokenHash = "";
    saveConfig();
  }

  async loginServiceAccount(name, opts={}) {
    if( opts.file ) {
      if( !path.isAbsolute(opts.file) ) {
        opts.file = path.join(process.cwd(), opts.file);
      }
      opts.secret = fs.readFileSync(opts.file, 'utf-8').trim();
    } else if( opts.env ) {
      opts.secret = process.env[opts.env];
    }

    if( !opts.secret ) {
      console.error('No secret provided');
      process.exit(1);
    }

    let resp = await fetch(`${config.host}/auth/service-account/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: name,
        secret: opts.secret
      })
    });

    if( resp.status !== 200 ) {
      console.error('Login failed', await resp.text());
      process.exit(1);
    }

    let body = await resp.json();

    config.token = body.access_token;
    const hash = crypto.createHash('md5').update(body.access_token).digest('base64');
    config.tokenHash = hash;

    saveConfig();

    this.updateService();
  }

  async getPemFile() {
    const pemResponse = await fetch(`${config.host}/.well-known/ca-chain.pem`, {
      headers: {
        Authorization: `Bearer ${config.token}`
      }
    });

    if (pemResponse.status !== 200) {
      console.error('Failed to fetch PEM file', await pemResponse.text());
      process.exit(1);
    }

    const pemContent = await pemResponse.text();
    fs.writeFileSync(this.PG_FARM_PEM, pemContent);
  }

  async updateService() {
    if( this.ROOT_CERT !== this.ROOT_SYSTEM_CERT ) {
      console.log('🔐 Using PG Farm certificate');
      await this.getPemFile();
    } else {
      console.log('🔐 Using system certificate');
    }

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

    let found = false;
    for( let serviceName in pgService ) {
      let serviceDef = pgService[serviceName];

      if( serviceDef.host === hostname && !hostname.startsWith('localhost') ) {
        if( serviceName === this.PG_SERVICE_NAME ) {
          found = true;
        }

        pgService[serviceName] = Object.assign(serviceDef, {
          port : serviceDef.port || 5432,
          user : serviceDef.username || username,
          sslmode: serviceDef.sslmode || 'verify-full',
          sslrootcert: this.ROOT_CERT,
          password : config.tokenHash
        });
      }
    }

    if( !found ) {
      pgService[this.PG_SERVICE_NAME] = {
        host : hostname,
        port : 5432,
        user : username,
        sslmode: 'verify-full',
        sslrootcert: this.ROOT_CERT,
        password : config.tokenHash
      }
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