import keycloak from '../../../lib/keycloak.js';
import metrics from '../../../lib/metrics/index.js';
import {ValueType} from '@opentelemetry/api';
import logger from '../../../lib/logger.js';

const metricRoot = 'pgfarm.pg-proxy.';

class ProxyStatus {

  constructor() {
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

  registerConnection(proxyConnection) {
    proxyConnection.on('stat', data => this._onSocketMessage(data, proxyConnection));
  }

  _onSocketMessage(msg, proxyConnection) {
    let dbName = msg.database || proxyConnection.startupProperties?.database;


    if( msg.type === 'query' ) {
      // if( !this.data.queryCount[dbName]  ) {
      //   this.data.queryCount[dbName] = 0;
      // }
      
      this.data.queryCount++;
    } else if( msg.type === 'instance-start' ) {
      this.data.instanceStarts.push(msg.data);
    }
  }

}

const instance = new ProxyStatus();
export default instance;