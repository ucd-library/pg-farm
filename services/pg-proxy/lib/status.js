import keycloak from '../../lib/keycloak.js';

class ProxyStatus {

  constructor() {
    this.DISCONNECT_TYPES = ['socket-error', 'socket-closed'];

    this.data = {};
    this.reset();
  }

  reset() {
    this.data = {
      connections: {},
      socketErrors: {},
      disconnects: {},
      instanceStarts: [],
      errors : []
    };
  }

  getStats() {
    this.data.tokenCacheSize = keycloak.tokenCache.size;
    return this.data;
  }

  register(proxyConnection) {
    proxyConnection.on('stats', data => this._onSocketMessage(data, proxyConnection));
  }

  _onSocketMessage(msg, proxyConnection) {
    if( this.DISCONNECT_TYPES.includes(msg.type) ) {
      proxyConnection.removeEventListeners();
    }

    if( msg.type === 'query' ) {
      this.inc('query', proxyConnection.dbName);
    } else if( msg.type === 'socket-error' ) {
      this.inc('socketErrors', proxyConnection.dbName);
      this.inc('disconnects', proxyConnection.dbName);
    } else if( msg.type === 'socket-closed' ) {
      this.inc('disconnects', proxyConnection.dbName);
    } else if( msg.type === 'socket-connect' ) {
      this.inc('connections', proxyConnection.dbName);
    } else if( msg.type === 'error' ) {
      this.data.errors.push(msg.data);
    } else if( msg.type === 'instance-start' ) {
      this.data.instanceStarts.push(msg.data);
    }
  }

  inc(key, db) {
    if( !this.data[key] ) {
      this.data[key] = {};
    }

    if( !this.data[key][db] ) {
      this.data[key][db] = 0;
    }

    this.data[key][db]++;
  }

}

const instance = new ProxyStatus();
export default instance;