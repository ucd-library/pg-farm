import httpProxy from 'http-proxy';
import {database, admin} from '../../models/index.js';
import client from '../../lib/pg-admin-client.js';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';
import metrics from '../../lib/metrics/index.js';
import {ValueType} from '@opentelemetry/api';
import {createContext} from '../../lib/context.js';

const dbRouteRegex = /^\/api\/query\/([-|\w]+)\/([-|\w]+)(\/|\?|$)/;
const swaggerUiRouteRegex = /^\/swagger-ui/;
const adminRoutes = ['/api', '/auth', '/login', '/.well-known'];

let DEFAULT_HOST = 'http://'+config.gateway.http.targetHost;
if( parseInt(config.gateway.http.targetPort) != 80 ) {
  DEFAULT_HOST += ':'+config.gateway.http.targetPort;
}

const metricRoot = 'pgfarm.http-proxy.';

let proxy;
let pgRestQueryCount = 0; 

function init() {
  proxy = httpProxy.createProxyServer({
    ignorePath : true
  });
  proxy.on('error', (err, req, res) => {
    logger.error('HTTP proxy error: ', {
      message: err.message,
      stack: err.stack,
      url: req.originalUrl,
      method: req.method,
      headers: req.headers,
      remoteIp : req.socket.remoteAddress,
      ipAddress : req.ip,
      forwarded : req.ips
    });
    res.status(500).send('Internal server error');
  });

  if( !metrics.meterProvider ) {
    return;
  }

  const meter = metrics.meterProvider.getMeter('default');
  const pgRestQueries = meter.createObservableGauge(metricRoot+'pg-rest-query',  {
    description: 'Number of PG Rest HTTP queries sent to a PG Farm database',
    unit: '',
    valueType: ValueType.INT,
  });
  pgRestQueries.addCallback(async result => {
    result.observe(pgRestQueryCount);
    pgRestQueryCount = 0;
  });
}

async function middleware(req, res) {
  let path = req.originalUrl;
  let host = DEFAULT_HOST;
  let dbRouteMatch = path.match(dbRouteRegex);
  let swaggerUiMatch = path.match(swaggerUiRouteRegex);

  if( dbRouteMatch ) {
    let orgName = dbRouteMatch[1];
    let dbName = dbRouteMatch[2];
    path = path.replace(dbRouteRegex, '/');
    if( orgName === '_' ) {
      orgName = null;
    }

    let ctx = await createContext({
      organization : orgName,
      database : dbName,
      corkTraceId : req.corkTraceId
    });

    // let db = await database.get(dbName, orgName);
    host = 'http://'+ctx.database.pgrest_hostname+':'+config.pgRest.port;

    // if the instance is marked as RUN in the db but is actually down,
    // it's up the the health service to start it.
    if( ctx.instance.state === 'ARCHIVE' ) {
      res.status(503).send('Database is archived.  Please reachout to PG Farm support for assistance.');
      return;
    } else if( ctx.instance.state !== 'RUN' ) {
      let startResp = await admin.startInstance(ctx);
      if( startResp.starting ) {
        await startResp.pgrest;
      }
    }

    client.updateDatabaseLastEvent(ctx.database.database_id, 'PGREST_REQUEST')
      .catch(e => logger.error('Error updating database last event: ', e));

    pgRestQueryCount++;
  } else if( path.match(/^\/api\/health(\/|$)/) ) {
    path = path.replace(/^\/api\/health/, '/health');
    host = 'http://'+config.healthProbe.host+':'+config.healthProbe.port;
  } else if( adminRoutes.some(route => path.startsWith(route)) ) {
    host = 'http://'+config.admin.host+':'+config.admin.port;
  } else if( swaggerUiMatch ) {
    try {
      let queryUrl = req.query.url;
      if( queryUrl ) {
        let hostname = new URL(queryUrl).hostname;
        if( !config.swaggerUi.allowedDomains.includes(hostname) ) {
          return res.status(403).send('Invalid swagger domain');
        }
      }
      host = 'http://'+config.swaggerUi.host+':'+config.swaggerUi.port;
    } catch(e) {
      return res.status(500).send('Error parsing swagger-ui url');
    }
  }

  logger.debug('HTTP Proxy Request: ', {
    url: req.originalUrl, 
    // method: req.method, 
    // headers: req.headers,
    // remoteIp : req.connection.remoteAddress,
    // ipAddress : req.ip,
    // forwarded : req.ips,
    target : host+path
  });

  proxy.web(req, res, {
    target : host+path
  });
}

export {
  init,
  middleware
}