import httpProxy from 'http-proxy';
import adminModel from '../../administration/src/models/admin.js';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';
import startInstance from '../../lib/instance-start.js';

const dbRouteRegex = /^\/api\/db\/(\w+)(\/|$)/;

let DEFAULT_HOST = 'http://'+config.gateway.http.targetHost;
if( parseInt(config.gateway.http.targetPort) != 80 ) {
  DEFAULT_HOST += ':'+config.gateway.http.targetPort;
}

let proxy;

function init() {
  proxy = httpProxy.createProxyServer({
    ignorePath : true
  });
  proxy.on('error', (err, req, res) => {
    logger.error('HTTP proxy error: ', err);
    res.status(500).send('Internal server error');
  });
}

async function middleware(req, res) {
  let path = req.path;
  let host = DEFAULT_HOST;
  let dbRouteMatch = path.match(dbRouteRegex);
  
  if( dbRouteMatch ) {
    let dbName = dbRouteMatch[1];
    path = path.replace(dbRouteRegex, '/');

    try {
      let instance = await adminModel.getInstance(dbName);
      host = 'http://pgrest-'+instance.name+':'+config.pgRest.port;

      await startInstance.start(dbName, instance, {waitForPgRest: true});
    } catch(e) {
      logger.error('Error starting database', dbName, e);
      res.status(404).send('Database not found');
      return;
    }
  }

  proxy.web(req, res, {
    target : host+path
  });
}

export {
  init,
  middleware
}