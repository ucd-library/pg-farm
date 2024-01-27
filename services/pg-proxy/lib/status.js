import keycloak from '../../lib/keycloak.js';
import metrics from '../../lib/metrics/index.js';
import {ValueType} from '@opentelemetry/api';

const metricRoot = 'pgfarm.pg-proxy.';

class ProxyStatus {

  constructor() {
    this.DISCONNECT_TYPES = ['socket-error', 'socket-closed'];

    this.data = {};
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

    const errors = meter.createObservableGauge(metricRoot+'socket-errors',  {
      description: 'Error proxy socket errors',
      unit: '',
      valueType: ValueType.INT,
    });
    errors.addCallback(async result => {
      for( let dbName in this.data.socketErrors.client ) {
        result.observe(this.data.socketErrors.client[dbName], {
          type: 'client', 
          db: dbName
        });

        this.data.socketErrors.client[dbName] = 0;
      }
      for( let dbName in this.data.socketErrors.client ) {
        result.observe(this.data.socketErrors.client[dbName], {
          type: 'server', 
          db: dbName
        });
        this.data.socketErrors.client[dbName] = 0;
      }
    });
  }

  reset() {
    this.data = {
      connections : {
        client : {},
        server : {}
      },
      socketErrors : {
        client : {},
        server : {}
      },
      instanceStarts: [],
      errors : []
    };
  }

  getStats() {
    this.data.tokenCacheSize = keycloak.tokenCache.size;
    return this.data;
  }

  register(proxyConnection) {
    proxyConnection.on('stat', data => this._onSocketMessage(data, proxyConnection));
  }

  _onSocketMessage(msg, proxyConnection) {
    if( this.DISCONNECT_TYPES.includes(msg.type) ) {
      proxyConnection.removeEventListeners();
    }

    let socket = msg.data.socket;
    let dbName = proxyConnection.startupProperties?.database;

    if( !dbName ) return;

    if( msg.type === 'query' ) {
      // this.inc('query', proxyConnection.dbName);
    } else if( msg.type === 'socket-error' ) {
      if( !this.data.socketErrors[socket][dbName] ) {
        this.data.socketErrors[socket][dbName] = 0;
      }
      this.data.socketErrors[socket][dbName]++;

      this.incCon(socket, dbName, -1);
    } else if( msg.type === 'socket-closed' ) {
      this.incCon(socket, dbName, -1);
    } else if( msg.type === 'socket-connect' ) {
      this.incCon(socket, dbName, 1);
    } else if( msg.type === 'error' ) {
      this.data.errors.push(msg.data);
    } else if( msg.type === 'instance-start' ) {
      this.data.instanceStarts.push(msg.data);
    }
  }

  incCon(socket, db, amount) {
    if( !this.data.connections[socket][db] ) {
      this.data.connections[socket][db] = 0;
    }

    this.data.connections[socket][db] += amount;
  }

}

const instance = new ProxyStatus();
export default instance;