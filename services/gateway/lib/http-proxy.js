import httpProxy from 'http-proxy';
import {database, admin} from '../../administration/src/models/index.js';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';

const dbRouteRegex = /^\/api\/db\/(\w+)\/(\w+)(\/|$)/;

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
  let path = req.originalUrl;
  let host = DEFAULT_HOST;
  let dbRouteMatch = path.match(dbRouteRegex);
  
  if( dbRouteMatch ) {
    let orgName = dbRouteMatch[1];
    let dbName = dbRouteMatch[2];
    path = path.replace(dbRouteRegex, '/');
    if( orgName === '_' ) {
      orgName = null;
    }

    try {
      await admin.startInstance(dbName, orgName, {
        waitForPgRest: true, 
        startPgRest: true,
        isDb: true
      });
    } catch(e) {
      logger.error('Error starting database', dbName, e);
      res.status(404).send('Database not found');
      return;
    }

    let db = await database.get(dbName, orgName);
    host = 'http://'+db.pgrest_hostname+':'+config.pgRest.port;

  } else if( path === '/api/db' || path === '/api/db/' ) {
    path = '/api/admin/instance';
  }

  proxy.web(req, res, {
    target : host+path
  });
}

export {
  init,
  middleware
}