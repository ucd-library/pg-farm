import keycloak from '../../../lib/keycloak.js';
import metrics from '../../../lib/metrics/index.js';
import client from '../../../lib/pg-admin-client.js';
import {ValueType} from '@opentelemetry/api';
import logger from '../../../lib/logger.js';

const metricRoot = 'pgfarm.pg-proxy.';

class ProxyMonitor {

  constructor() {
    this.data = {};

    this.PROXY_EVENTS = { 
      AUTHENTICATION_OK : 'authentication-ok',
      INSTANCE_START : 'instance-start',
      CREATE_SERVER_SOCKET : 'create-server-socket',
      CLOSING_CLIENT : 'closing-client',
      CLOSING_SERVER : 'closing-server',
      CLIENT_CLOSE : 'client-close',
      PUBLIC_LOGIN : 'public-login',
      RECONNECT : 'reconnect',
      ERROR_MESSAGE : 'error-message',
      RECONNECT_FAILED : 'reconnect-failed',
      SEND_STARTUP_MESSAGE : 'send-startup-message',
      RESEND_STARTUP_MESSAGE : 'resend-startup-message',
      SERVER_CONNECTED : 'server-connected',
      SERVER_CLOSE : 'server-close',
      SLEEP_MODE : 'sleep-mode',
      SEND_PENDING_MESSAGES : 'send-pending-messages',
      SEND_PASSWORD : 'send-password',
    }

    this.reset();

    if( !metrics.meterProvider ) {
      return;
    }

    const meter = metrics.meterProvider.getMeter('default');
    const tcpSocketConnections = meter.createObservableGauge(metricRoot+'connections',  {
      description: 'Number of TCP connections',
      unit: '',
      valueType: ValueType.INT,
    });

    tcpSocketConnections.addCallback(async result => {
      for( let dbName in this.data.connections.client ) {
        result.observe(this.data.connections.client[dbName], {
          type: 'client', 
          db: dbName
        });
      }
      for( let dbName in this.data.connections.server ) {
        result.observe(this.data.connections.server[dbName], {
          type: 'server', 
          db: dbName
        });
      }
    });

    const queryCount = meter.createObservableGauge(metricRoot+'queries',  {
      description: 'Queries sent to a PG Farm database',
      unit: '',
      valueType: ValueType.INT,
    });
    queryCount.addCallback(async result => {
      result.observe(this.data.queryCount);
      this.data.queryCount = 0;
    });
  }

  reset() {
    this.data = {
      queryCount : 0,
      instanceStarts: []
    };
  }

  getStats() {
    this.data.tokenCacheSize = keycloak.tokenCache.size;
    return this.data;
  }

  onQuery(databaseId) {
    client.updateDatabaseLastEvent(databaseId, 'QUERY')
      .catch(e => logger.error('Error updating database last event: ', e));

    this.data.queryCount++;
  }

  onInstanceStart(data) {
    this.data.instanceStarts.push(data);
  }

  async onClientConnection(proxyConnection) {
    try {
      await client.onConnectionOpen({
        sessionId: proxyConnection.sessionId,
        databaseName: proxyConnection.pgFarmUser.database_name,
        orgName: proxyConnection.pgFarmUser.organization_name,
        userName: proxyConnection.pgFarmUser?.username,
        remoteAddress: proxyConnection.ipAddress,
        gatewayId: proxyConnection.server.id,
        data : {
          startupProperties: proxyConnection.startupProperties
        },
        timestamp: new Date().toISOString()
      });
    } catch(e) {
      logger.error('Error logging client connection to pg: ', e);
    }
  }

  async onClientDisconnect(proxyConnection) {
    try {
      await client.onConnectionClose(
        proxyConnection.sessionId,
        new Date().toISOString()
      );
    } catch(e) {
      logger.error('Error logging client disconnect to pg: ', e);
    }

    this.logProxyConnectionEvent(proxyConnection, this.PROXY_EVENTS.CLIENT_CLOSE, proxyConnection.pgFarmUser?.username);
  }

  async logProxyConnectionEvent(proxyConnection, event, message) {
    try {
      if( typeof message !== 'string' ) {
        message = JSON.stringify(message);
      }

      await client.logProxyConnectionEvent(
        proxyConnection.sessionId, event, message
      );
    } catch(e) {
      logger.error('Error logging proxy event to pg: ', 
        {sessionId: proxyConnection.sessionId, event, message}, 
        e
      );
    }
  }

}

const instance = new ProxyMonitor();
export default instance;