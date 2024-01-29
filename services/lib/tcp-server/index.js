import net from 'net';
import ProxyMonitor from './monitor.js';
import utils from '../../lib/utils.js';
import logger from '../../lib/logger.js';
import {v4 as uui4} from 'uuid';

class PgFarmTcpServer {
  constructor(opts, onConnection) {
    this.opts = opts;
    this.name = opts.name || 'pgfarm-tcp-server';
    this.metrics = new ProxyMonitor(this.name, {
      logging: opts.logging
    });

    if( onConnection ) {
      this.onConnection = onConnection.bind(this);
    }

    this.server = null;
    this.sockets = new Map();
    this.sessions = new Map();
  }

  getSessionId() {
    return uui4().split('-').pop();
  }

  start() {
    this.server = net.createServer(socket => this._onIncomingConnection(socket));
    
    this.metrics.registerServer(this.server);
    this.metrics.init();
    
    this.server.listen(this.opts.port, () => {
      logger.info(`${this.name} is running on port ${this.opts.port}`);
    });
  }

  createProxyConnection(host, port, incomingSocket) {
    let sessionId = this.sockets.get(incomingSocket).session;

    const socket = net.createConnection({ 
      host, port
    });
    this.registerConnection(socket, 'outgoing', sessionId);
    return socket;
  }

  setSocketProperties(socket, props) {
    this.metrics.setSocketProperties(socket, props);
  }

  registerConnection(socket, type, session) {
    if( this.sockets.has(socket) ) {
      logger.error('Socket already registered',  type, session);
      return;
    }
  
    // register lookup for socket properties
    this.sockets.set(socket, {type, session});

    // register lookup for sockets by session id
    let sockets = this.sessions.get(session) || [];
    sockets.push(socket);
    this.sessions.set(session, sockets);

    this.metrics.registerSocket(socket, type, session);

    // listen close event
    socket.on('close', () => {
      setTimeout(() => {
        this.sockets.delete(socket);

        let sockets = this.sessions.get(session);
        let index = sockets.indexOf(socket);
        if( index > -1 ) sockets.splice(index, 1);

        if( sockets.length === 0 ) {
          this.sessions.delete(session);
        } else {
          this.sessions.set(session, sockets);
        }

        socket.removeAllListeners();
        socket.destroy();
      });

      let sockets = this.sessions.get(session);
      for( let s of sockets ) {
        if( s === socket ) continue;
        s.end();
      }
    });

    socket.on('timeout', () => {
      utils.closeSocket(socket)
        .then(() => logger.info('Closed socket successfully'))
        .catch(err => logger.error('Failed to close socket', err));
    });
  }

  _onIncomingConnection(socket) {
    let pgFarmSession = this.getSessionId();
    this.registerConnection(socket, 'incoming', pgFarmSession);
    if( this.onConnection ) {
      this.onConnection(socket);
    }
  }
}

export default PgFarmTcpServer;