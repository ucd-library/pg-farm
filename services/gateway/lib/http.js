import express from 'express';
import httpProxy from 'http-proxy';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';

const app = express();

let proxy;
if( config.gateway.http.enabled ) {
  proxy = httpProxy.createProxyServer({
    // ignorePath : true
  });
  proxy.on('error', (err, req, res) => {
    logger.error('HTTP proxy error: '+err.message);
    res.status(500).send('Internal server error');
  });
};

if( config.gateway.http.enabled ) {
  logger.info('HTTP service enabled, will not proxy to HTTPS');
}

app.use((req, res) => {

  if( config.gateway.http.enabled ) {
    let target = 'http://'+config.gateway.http.targetHost;
    if( parseInt(config.gateway.http.targetPort) != 80 ) {
      target += ':'+config.gateway.http.targetPort;
    }

    proxy.web(req, res, { target });
    return;
  }

  res.redirect('https://'+req.hostname+req.url);
});

app.listen(config.gateway.http.port, () => {
  logger.info('PG Farm Gateway HTTP service listening on port '+config.gateway.http.port);
});