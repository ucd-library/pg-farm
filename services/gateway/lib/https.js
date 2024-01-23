import https from 'https';
import express from 'express';
import httpProxy from 'http-proxy';
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
  const proxy = httpProxy.createProxyServer({
    // ignorePath : true
  });

  const certOpts = {
    key: fs.readFileSync(config.gateway.https.key),
    cert: fs.readFileSync(config.gateway.https.cert)
  };

  let target = 'http://'+config.gateway.http.targetHost;
  if( parseInt(config.gateway.http.targetPort) != 80 ) {
    target += ':'+config.gateway.http.targetPort;
  }

  app.use((req, res) => {
    proxy.web(req, res, { target  });
  });

  https.createServer(certOpts, app).listen(config.gateway.https.port, () => {
    logger.info('PG Farm Gateway HTTPS service listening on port '+config.gateway.https.port);
  });
}

start();
