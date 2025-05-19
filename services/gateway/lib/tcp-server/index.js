import net from 'net';
import ProxyMonitor from './monitor.js';
import utils from '../../../lib/utils.js';
import logger from '../../../lib/logger.js';
import pgClient from '../../../lib/pg-admin-client.js';
import {v4 as uuid4} from 'uuid';

/**
 * @class PgFarmTcpServer
 * @description TCP server that listens for incoming connections and starts a new
 * proxy connection.  Monitors the connections and handles disconnects.
 **/
class PgFarmTcpServer {
  constructor(opts, onConnection) {
    this.id = uuid4();
    this.opts = opts;
    this.name = opts.name || 'pgfarm-tcp-server';
    this.metrics = new ProxyMonitor(this.name, {
      logging: opts.logging
    });

    // register a callback to be called when a new connection is made
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

    process.on('SIGINT', async () => {
      logger.warn('Received SIGINT, closing all sockets');
      this.server.close();
      await this.onShutdown();
      process.exit();
    });
    process.on('SIGTERM', async () => {
      logger.warn('Received SIGTERM, closing all sockets');
      this.server.close();
      await this.onShutdown();
      process.exit();
    });
  }

  /**
   * @method getSessionId
   * @description Generate a unique session id
   * 
   * @returns {string}
   **/
  getSessionId() {
    return uuid4().split('-').pop();
  }

  /**
   * @method start
   * @description Start the tcp server and listen for incoming connections
   */
  start() {
    this.server = net.createServer(socket => this._onIncomingConnection(socket));
    
    this.metrics.registerServer(this.server);
    this.metrics.init();
    
    this.server.listen(this.opts.port, () => {
      logger.info(`${this.name} is running on port ${this.opts.port}`);
    });
  }

  async onShutdown() {
    let proms = [];
    for (let session of this.sessions.keys()) {
      let info = this.sessions.get(session);
      if (info.pgConnection) {
        proms.push(info.pgConnection.onShutdown());
      }
    }

    await Promise.allSettled(proms);
  }

  /**
   * @method createProxyConnection
   * @description Create a tcp connection to the specified host and port.  register the connection
   * and return the socket
   * 
   * @param {String} host hostname to connect to
   * @param {Number} port port to connect to
   * @param {net.Socket} incomingSocket incoming socket that is being proxied
   * 
   * @returns {net.Socket}
   **/
  createProxyConnection(host, port, incomingSocket, proxyConnection) {
    let socketInfo = this.sockets.get(incomingSocket);
    if( !socketInfo ) {
      logger.error('Socket not found');
      return;
    }

    let sessionId = socketInfo.session;

    // create the new outgoing tcp socket
    const socket = net.createConnection({ 
      host, port
    });

    // register the socket with the current proxy session
    this.registerConnection(socket, 'outgoing', sessionId, proxyConnection);

    return socket;
  }

  setSocketProperties(socket, props) {
    this.metrics.setSocketProperties(socket, props);
  }

  /**
   * @method registerConnection
   * @description Register a connection with the server.  Creates a lookup for the socket
   * based on the session id.  Listens for close events on the socket and disconnects all
   * other sockets associated with the session id on close.  Additionally handles
   * timeout events on the socket which should cause a disconnect of all sockets (dont want 
   * these to hang)
   * 
   * @param {net.Socket} socket socket to register
   * @param {String} type incoming or outgoing
   * @param {String} session session id
   * @param {Object} pgConnection ProxyConnection instance
   **/
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

    this.metrics.registerSocket(socket, type, pgConnection);

    // listen close event
    socket.on('close', () => {
      setTimeout(() => {
        this.sockets.delete(socket);

        // find the socket by session and remove it
        let {sockets, pgConnection} = this.sessions.get(session);
        let index = sockets.indexOf(socket);
        if( index > -1 ) sockets.splice(index, 1);

        // if there are no more sockets for the session, remove the session
        if( sockets.length === 0 ) {
          this.sessions.delete(session);
        } else {
          this.sessions.set(session, {sockets, pgConnection});
        }

        // remove all event listeners and destroy the socket
        socket.removeAllListeners();
        socket.destroySoon();

        // if autoCloseSockets is false, do not close other sockets
        if( !pgConnection.autoCloseSockets ) {
          logger.info('autoCloseSockets set to false, not closing other sockets for session', session);
          return;
        }

        // close all other sockets for the session
        logger.info('Closing all sockets for session', {
          socketType : type,
          socketSessionId: session
        });
        for( let s of sockets ) {
          s.destroySoon();
        }
      }, 100);
      
    });

    // listen for timeout events and handle
    socket.on('timeout', () => {
      utils.closeSocket(socket)
        .then(() => logger.info('Closed socket successfully'))
        .catch(err => logger.error('Failed to close socket', err));
    });
  }

  /**
   * @method _onIncomingConnection
   * @description Handle incoming connections to tcp server.  Register the 
   * connection and call the onConnection which should return a ProxyConnection
   * instance.  
   * 
   * @param {net.Socket} socket incoming tcp socket
   **/
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