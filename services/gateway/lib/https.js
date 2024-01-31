import https from 'https';
import express from 'express';
import {init, middleware} from './http-proxy.js';
import fs from 'fs';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';

function start() {
  if( !fs.existsSync(config.gateway.https.key) ||
      !fs.existsSync(config.gateway.https.cert) ) {
    logger.warn('Missing HTTPS key or certificate.  Not starting HTTPS service.');
    return;
  }

  const app = express();

  const certOpts = {
    key: fs.readFileSync(config.gateway.https.key),
    cert: fs.readFileSync(config.gateway.https.cert)
  };

  init();
  app.use(middleware);

  https.createServer(certOpts, app).listen(config.gateway.https.port, () => {
    logger.info('PG Farm Gateway HTTPS service listening on port '+config.gateway.https.port);
  });
}

start();