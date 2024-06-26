import express from 'express';
import {init, middleware} from './http-proxy.js';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';
import cidrDeny from './cidr-deny.js';

const app = express();
app.set('trust proxy', 1);

if( config.gateway.http.enabled ) {
  init();
};

if( config.gateway.http.enabled ) {
  logger.info('HTTP service enabled, will not proxy to HTTPS');
}

config.gateway.cidrDeny.logger = logger;
app.use(cidrDeny(config.gateway.cidrDeny));

app.use((req, res) => {
  if( config.gateway.http.enabled ) {
    middleware(req, res);
    return;
  }

  res.redirect('https://'+req.hostname+req.url);
});

app.listen(config.gateway.http.port, () => {
  logger.info('PG Farm Gateway HTTP service listening on port '+config.gateway.http.port);
});