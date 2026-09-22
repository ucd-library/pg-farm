import keycloak from '../../../lib/keycloak.js';
import metrics from '../../../lib/metrics/index.js';
import client from '../../../lib/pg-admin-client.js';
import logger from '../../../lib/logger.js';

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
      SERVER_END : 'server-end',
      SERVER_ERROR : 'server-error',
      SERVER_CLOSE : 'server-close',
      SLEEP_MODE : 'sleep-mode',
      SEND_PENDING_MESSAGES : 'send-pending-messages',
      SEND_PASSWORD : 'send-password',
    }

    this.reset();

    if( !metrics.enabled ) {
      return;
    }

    this.connectionsGauge = new metrics.Gauge({
      name: 'pgfarm_proxy_connections',
      help: 'Number of TCP connections, both incoming and outgoing are reported',
      labelNames: ['type', 'database'],
      registers: [metrics.registry],
      collect: () => {
        for( let dbName in this.data.connections?.client || {} ) {
          this.connectionsGauge.set({type: 'client', database: dbName}, this.data.connections.client[dbName]);
        }
        for( let dbName in this.data.connections?.server || {} ) {
          this.connectionsGauge.set({type: 'server', database: dbName}, this.data.connections.server[dbName]);
        }
      }
    });

    this.queriesCounter = new metrics.Counter({
      name: 'pgfarm_proxy_queries_total',
      help: 'Queries sent to a PG Farm database',
      labelNames: ['database'],
      registers: [metrics.registry]
    });

    this.bytesCounter = new metrics.Counter({
      name: 'pgfarm_proxy_bytes_total',
      help: 'Bytes proxied between clients and PG Farm databases',
      labelNames: ['direction', 'organization', 'database'],
      registers: [metrics.registry]
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
    this.queriesCounter?.inc({database: databaseId});
  }

  /**
   * @method onBytes
   * @description record bytes proxied in a single direction for a connection, called from
   * ProxyConnection.writeAndWait for every write in either direction.
   *
   * @param {String} direction 'ingress' (client -> postgres) or 'egress' (postgres -> client)
   * @param {Number} byteLength number of bytes written
   * @param {Object} pgFarmUser resolved pgfarm user/database info for the connection, may be
   * null/undefined before authentication completes
   */
  onBytes(direction, byteLength, pgFarmUser) {
    this.bytesCounter?.inc({
      direction,
      organization: pgFarmUser?.organization_name || 'unknown',
      database: pgFarmUser?.database_name || 'unknown'
    }, byteLength);
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
      logger.error('Error logging client disconnect to pg-admin database:', e);
    }

    try {
      await client.updateConnectionBytes({
        sessionId: proxyConnection.sessionId,
        bytesIngress: proxyConnection.bytesIngress,
        bytesEgress: proxyConnection.bytesEgress
      });
    } catch(e) {
      logger.error('Error updating connection byte totals: ', e);
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
