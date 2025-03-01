import https from 'https';
import express from 'express';
import tls from 'tls';
import {init, middleware} from './http-proxy.js';
import fs from 'fs';
import path from 'path';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';
import cidrDeny from './cidr-deny.js';
import {logReqMiddleware} from '@ucd-lib/logger';

let defaultKey, defaultCert;


function loadSecureContext(folder) {
  let domain = folder.split('/').pop();
  let files = fs.readdirSync(folder);
  let cert, key;
  
  for( let file of files ) {
    if( file.match(/\.key$/) ) {
      if( !defaultKey ) {
        defaultKey = path.join(folder, file)
      } 
      key = fs.readFileSync(path.join(folder, file));
    } else if( file.match(/\.crt$/) ) {
      if( !defaultCert ) {
        defaultCert = path.join(folder, file);
      }
      cert = fs.readFileSync(path.join(folder, file));
    }
  }

  if( !key || !cert ) {
    logger.warn('Missing key or certificate for '+domain);
    return null;
  }
  logger.info('Loaded key and certificate for '+domain);

  return tls.createSecureContext({key, cert});
}

function start() {

  if( !fs.existsSync(config.gateway.https.certFolder) ) {
    logger.warn('Missing HTTPS certificate folder.  Not starting HTTPS service.');
    return;
  }

  let domains = fs.readdirSync(config.gateway.https.certFolder);
  let secureContexts = {};
  for( let domain of domains ) {
    let folder = path.join(config.gateway.https.certFolder, domain);
    let ctx = loadSecureContext(folder);
    if( ctx ) {
      secureContexts[domain] = ctx;
    }
  }

  let keys = Object.keys(secureContexts);
  if( keys.length === 0 ) {
    logger.warn('No valid keys/certificates found.  Not starting HTTPS service.');
    return;
  }

  const app = express();

  app.use(logReqMiddleware(logger));
  // app.set('trust proxy', 1);

  // config.gateway.cidrDeny.logger = logger;
  // app.use(cidrDeny(config.gateway.cidrDeny));

  const certOpts = {
    SNICallback: (domain, cb) => {
      cb(null, secureContexts[domain]);
    },
    key: fs.readFileSync(defaultKey),
    cert: fs.readFileSync(defaultCert)
  };

  init();
  app.use(middleware);

  https.createServer(certOpts, app).listen(config.gateway.https.port, () => {
    logger.info('PG Farm Gateway HTTPS service listening on port '+config.gateway.https.port);
  });
}

start();