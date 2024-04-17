import net from 'net';
import ProxyMonitor from './monitor.js';
import utils from '../../../lib/utils.js';
import logger from '../../../lib/logger.js';
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

    // if true, close all sockets whenever a connection is closed
    // set to false if you want to keep the other sockets open after
    // a disconnect.  Used to support server moves
    this.autoCloseSockets = true;

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
    let socketInfo = this.sockets.get(incomingSocket);
    if( !socketInfo ) {
      logger.error('Socket not found');
      return;
    }

    let sessionId = socketInfo.session;

    const socket = net.createConnection({ 
      host, port
    });
    this.registerConnection(socket, 'outgoing', sessionId);
    return socket;
  }

  setSocketProperties(socket, props) {
    this.metrics.setSocketProperties(socket, props);
  }

  registerConnection(socket, type, session, pgConnection=null) {
    if( this.sockets.has(socket) ) {
      logger.error('Socket already registered',  type, session);
      return;
    }
  
    // register lookup for socket properties
    this.sockets.set(socket, {type, session});

    // register lookup for sockets by session id
    let sessionInfo = this.sessions.get(session) || {sockets: [], pgConnection};
    sessionInfo.sockets.push(socket);
    this.sessions.set(session, sessionInfo);

    this.metrics.registerSocket(socket, type, session);

    // listen close event
    socket.on('close', () => {
      setTimeout(() => {
        this.sockets.delete(socket);

        let {sockets, pgConnection} = this.sessions.get(session);
        let index = sockets.indexOf(socket);
        if( index > -1 ) sockets.splice(index, 1);

        if( sockets.length === 0 ) {
          this.sessions.delete(session);
        } else {
          this.sessions.set(session, {sockets, pgConnection});
        }

        socket.removeAllListeners();
        socket.destroySoon();

        if( !pgConnection.autoCloseSockets ) {
          logger.info('autoCloseSockets set to false, not closing other sockets for session', session);
          return;
        }

        logger.info('Closing all sockets for session', session);
        for( let s of sockets ) {
          s.destroySoon();
        }
      }, 100);
      
    });

    socket.on('timeout', () => {
      utils.closeSocket(socket)
        .then(() => logger.info('Closed socket successfully'))
        .catch(err => logger.error('Failed to close socket', err));
    });
  }

  _onIncomingConnection(socket) {
    let pgFarmSession = this.getSessionId();
    
    let pgConnection;
    if( this.onConnection ) {
      pgConnection = this.onConnection(socket, pgFarmSession);
    }
    this.registerConnection(socket, 'incoming', pgFarmSession, pgConnection);
  }
}

export default PgFarmTcpServer;