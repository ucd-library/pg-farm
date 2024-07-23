import httpProxy from 'http-proxy';
import {database, admin} from '../../models/index.js';
import client from '../../lib/pg-admin-client.js';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';
import metrics from '../../lib/metrics/index.js';
import {ValueType} from '@opentelemetry/api';

const dbRouteRegex = /^\/api\/db\/([-|\w]+)\/([-|\w]+)(\/|\?|$)/;

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
    logger.error('HTTP proxy error: ', err);
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

  if( dbRouteMatch && orgName !== 'metadata' ) {
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

    client.updateDatabaseLastEvent(db.database_id, 'PGREST_REQUEST')
      .catch(e => logger.error('Error updating database last event: ', e));

    pgRestQueryCount++;
  } else if( path.match(/^\/api\/health(\/|$)/) ) {
    path = path.replace(/^\/api\/health/, '/health');
    host = 'http://'+config.healthProbe.host+':'+config.healthProbe.port;
  } else if( path.startsWith('/api') || path.startsWith('/auth') || path.startsWith('/login') ) {
    host = 'http://'+config.admin.host+':'+config.admin.port;
  }

  logger.debug('HTTP Proxy Request: ', {
    url: req.originalUrl, 
    method: req.method, 
    headers: req.headers,
    remoteIp : req.connection.remoteAddress,
    ipAddress : req.ip,
    forwarded : req.ips,
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