import tls from 'tls';
import fs from 'fs';
import keycloak from '../../../lib/keycloak.js';
import config from '../../../lib/config.js';
import utils from '../../../lib/utils.js';
import logger from '../../../lib/logger.js';
import { createContext } from '../../../lib/context.js';
import monitor from './monitor.js';
import {admin, user as userModel, instance} from '../../../models/index.js';

let tlsOptions = {};
if( config.proxy.tls.key && 
    config.proxy.tls.cert && 
    fs.existsSync(config.proxy.tls.key) &&
    fs.existsSync(config.proxy.tls.cert) ) {

  tlsOptions.key = fs.readFileSync(config.proxy.tls.key);
  tlsOptions.cert = fs.readFileSync(config.proxy.tls.cert);
}

/**
 * @class ProxyConnection
 * @description handles the tcp socket connections between the client and the proxy as 
 * well as the proxy and the postgres server.  This class handles the pg wire protocol 
 * messages and the authentication flow between the client and the server for jwt authentication as
 * well as silent reconnects of a server pod is rebalanced or restarted in Kubernetes.
 */
class ProxyConnection {

  /**
   * @constructor
   * @description create a new proxy connection
   * 
   * @param {Socket} clientSocket incoming client socket
   * @param {PgFarmTcpServer} server tcp server
   * @param {String} sessionId unique session id created by the server
   */
  constructor(clientSocket, server, sessionId) {
    this.sessionId = sessionId;
    this.clientSocket = clientSocket;

    // created after startup message and successful user auth
    this.serverSocket = null; 
    this.server = server;

    // cleanup up ip address
    let ipv4 = (this.clientSocket.remoteAddress || '').match(/([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})/);
    if( ipv4 ) this.ipAddress = ipv4[1];
    else this.ipAddress = this.clientSocket.remoteAddress;

    // have we sent the clients startup message
    this.startupMessageHandled = false; 

    // if ssl request has been handled
    this.sslHandled = false; 
    this.isSecureSocket = false;

    // if we are intercepting server auth messages and logging user in
    // via the password stored in the pg farm database
    this.handlingJwtAuth = false;

    // user information from pg farm database
    this.pgFarmUser = null;

    // original startup message for replaying startup message on reconnect
    this.startUpMsg = null;
    this.startUpMsgSent = false;

    // captured shutdown message.  Used if reconnect fails or server is put to sleep or archived
    this.shutdownMsg = null;

    // pending messages while reconnecting
    this.pendingMessages = [];

    // if we are waiting for a reconnect.  This is the time of the reconnect
    this.awaitingReconnect = null;

    // if we are checking the pg instance status.  this is set before awaiting reconnect
    this.checkingPgInstStatus = false;

    // track if client socket close handler has been called
    this.clientSocketClosed = false;

    // track if client socket is active in the last isClientSocketActiveTime 
    this.isClientSocketActive = false;
    this.isClientSocketActiveTime = 5; // second
    this.isClientSocketActiveTimeout = null;

    // should all connection sockets be closed when any connection is closed
    // set to false to keep client socket alive on server disconnect during reconnect
    this.autoCloseSockets = true;


    this.SSL_REQUEST = 0x04D2162F;
    this.GSSAPI_REQUEST = 0x04D21630;
    this.GSSAPI_RESPONSE = Buffer.from('G', 'utf8'); // from server debug

    this.ALLOWED_USER_TYPES = ['ADMIN', 'USER', 'PUBLIC', 'SERVICE_ACCOUNT'];
    this.ALLOWED_INSTANCE_STATES = ['RUN', 'SLEEP'];

    this.MESSAGE_CODES = {
      PASSWORD: 0x70,
      SEND_PASSWORD: 0x52,
      ERROR: 0x45,
      NOTICE: 0x4e,
      QUERY: 0x51,
      AUTHENTICATION_OK: 0x52
    }

    this.AUTHENTICATION_CODE = {
      OK: 0,
      CLEARTEXT_PASSWORD: 3
    }

    this.ERROR_MSG_FIELDS = {
      // https://www.postgresql.org/docs/current/protocol-error-fields.html
      SEVERITY: 0x53,
      CODE: 0x43,
      MESSAGE: 0x4d,
      DETAIL: 0x44,
      HINT: 0x48,
      LINE: 0x4c,
      FILE: 0x46,
      ROUTINE: 0x52,
      SEVERITY_LOCALIZED: 0x56,
    }

    // https://www.postgresql.org/docs/current/errcodes-appendix.html
    this.ERROR_CODES = {
      ADMIN_SHUTDOWN: '57P01',
      CONNECTION_FAILURE: '08006',
      INVALID_PASSWORD: '28P01',
      SQLSERVER_REJECTED_ESTABLISHMENT_OF_SQLCONNECTION: '08004' 
    }

    this.NOTICE_SEVERITY = {
      FATAL : 'FATAL',
      PANICE : 'PANIC',
      ERROR: 'ERROR',
      WARNING: 'WARNING',
      NOTICE: 'NOTICE',
      DEBUG: 'DEBUG',
      INFO: 'INFO',
      LOG: 'LOG'
    }

    this.NOTICE_ERROR_SEVERITIES = [
      this.NOTICE_SEVERITY.FATAL,
      this.NOTICE_SEVERITY.PANICE,
      this.NOTICE_SEVERITY.ERROR
    ]

    // env.PROXY_DEBUG
    this.debugEnabled = config.proxy.debug;
    if( this.debugEnabled ) {
      logger.warn('Proxy debug enabled');
    }
    this.isDebugLogLevel = (config.logLevel === 'debug');

    this.init();
  }

  /**
   * @method getConnectionInfo
   * @description get connection information for logging
   * 
   * @returns {Object}
   **/
  getConnectionInfo() {
    let info = {
      socketSessionId: this.sessionId
    };
    if( this.clientSocket ) {
      info.clientSocketState = this.clientSocket.readyState;
    }
    if( this.serverSocket ) {
      info.serverSocketState = this.serverSocket.readyState;
    }
    if( this.startupProperties ) {
      info.database = this.startupProperties.database;
      info.user = this.startupProperties.user;
    }
    if( this.instance ) {
      info.instance = this.instance.name;
    }
    return info;
  }

  /**
   * @method init
   * @description setup this socket listeners for data, error, and end
   * events.
   * 
   */
  init() {
    logger.debug('proxy handling new connection', {remoteAddress: this.ipAddress});

    // When the client sends data, forward it to the target server
    this.clientSocket.on('data', data => this.onClientSocketData(data));

    // Handle client socket closure - multiple events for reliability
    this.clientSocket.on('close', () => this.onClientSocketClose());
    this.clientSocket.on('end', () => this.onClientSocketClose());
    this.clientSocket.on('error', (err) => {
      logger.warn('Client socket error', this.getConnectionInfo(), err);
      this.onClientSocketClose();
    });

    // Set socket keepalive to detect dead connections faster
    this.clientSocket.setKeepAlive(true, 30000); // 30 second keepalive
  }

  /**
   * @method onClientSocketClose
   */
  onClientSocketClose() {
    // Prevent multiple calls
    if (this.clientSocketClosed) return;
    this.clientSocketClosed = true;

    logger.info('Client socket closed/disconnected', this.getConnectionInfo());
    monitor.onClientDisconnect(this);
  }

  /**
   * @method resetClientActive
   * @description reset the client socket active flag.  Used to know if we need to kill
   * the client connection on drop of server connection.  If the client is active, we
   * can't keep the connection alive because we don't know what state the two connections are in.
   */
  resetClientActive() {
    this.isClientSocketActive = true;
    if( this.isClientSocketActiveTimeout ) {
      clearTimeout(this.isClientSocketActiveTimeout);
    }

    this.isClientSocketActiveTimeout = setTimeout(() => {
      this.isClientSocketActive = false;
      this.isClientSocketActiveTimeout = null;
    }, this.isClientSocketActiveTime * 1000);
  }

  /**
   * @method onClientSocketData
   * @description handle the data from the client socket.
   * 
   * @param {Buffer} data binary data from the tcp client socket
   * @param {Boolean} fromSecureSocket if the data is from a secure TLS socket
   **/
  async onClientSocketData(data, fromSecureSocket = false) {
    try {
      this.debug('client'+(fromSecureSocket ? '-secure' : ''), data);

      if( this.sleepMode ) {
        this.pendingMessages.push(data);
        this.reconnect();
        return;
      }

      // if we are attempting reconnect, just buffer the message
      if (this.awaitingReconnect || this.handlingJwtAuth || this.checkingPgInstStatus ) {
        this.pendingMessages.push(data);
        return;
      }

      this.resetClientActive();

      // check for SSL and special auth messages
      if (!this.startupMessageHandled && data.length == 8 ) { 
        await this.handlePreStartupMessage(data);
        return;
      }

      // check first message, provides the connection properties
      if ( !this.startupMessageHandled && data.length ) {
        await this.handleStartupMessage(data);
        return;
      }

      // intercept the password message and handle it
      if (data.length && 
          data[0] === this.MESSAGE_CODES.PASSWORD &&
          this.pgFarmUser?.user_type !== 'PUBLIC' &&
          this.pgFarmUser?.isAuthenticated !== true
        ) {
        this.pgFarmUser.isAuthenticated = await this.handleJwt(data);
        return;
      }

      // check for query message, if so, emit stats
      if (data.length && data[0] === this.MESSAGE_CODES.QUERY) {
        // console.log('Query message start, len=', data.readInt32BE(1), ' Buffer length=', data.length);
        monitor.onQuery(this.pgFarmUser.database_id);
      } 
      // else {
      //   let c = String.fromCharCode(data[0])
      //   console.log('Other message type, code="'+c+'" len=', data.readInt32BE(1), ' Buffer length=', data.length);
      // }

      // else, just proxy message
      await this.writeAndWait(this.serverSocket, data);
    } catch(e) {
      logger.warn('Error handling client data', this.getConnectionInfo(), e);
      this.closeSockets();
    }
  }

  /**
   * @method handleStartupMessage
   * @description handle the startup message from the pg client.
   * This message provides the connection properties such as user and database.
   **/
  async handleStartupMessage(data) {
    if( config.proxy.tls.enabled && !this.isSecureSocket ) {
      logger.info('client attempting clear text connection with tls enabled, closing connection', this.getConnectionInfo());
      await this.sendNotice(
        this.NOTICE_SEVERITY.FATAL,
        this.ERROR_CODES.SQLSERVER_REJECTED_ESTABLISHMENT_OF_SQLCONNECTION,
        'Plain text connection attempted but SSL is required.  Ensure your client is connecting with SSL enabled.',
        'See sslmode documentation https://www.postgresql.org/docs/current/libpq-ssl.html#LIBPQ-SSL-PROTECTION',
        'If you see this message after a failed login message, your client may be attempting to reconnect without SSL.',
        this.clientSocket
      );
      this.closeSockets();
      return;
    }

    logger.info('client handling startup message', data.length, this.getConnectionInfo())
  

    this.parseStartupMessage(data);
    logger.info('startup message parsed', this.getConnectionInfo());

    try {
      // this checks if user has access to database
      let success = await this.checkUserAccess();

      // if user has no access, close connection
      if (!success) {
        logger.info('invalid user access or database is in archived state, closing connection', this.getConnectionInfo());
        this.closeSockets();
        return;
      }

    // general error handling for user auth
    } catch (e) {
      logger.error('Error checking user access to database', this.getConnectionInfo(), e);
      this.closeSockets();
      return;
    }

    monitor.onClientConnection(this);

    // if public user, just create a direct connection
    if( this.pgFarmUser?.user_type === 'PUBLIC' ) {
      logger.info(`Public user ${this.startupProperties.user} logging in with a direct proxy of password`, this.getConnectionInfo());
      monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.PUBLIC_LOGIN, this.startupProperties.user);

      await this.createServerSocket(); // this sends startup message on connect
      return;
    } 

    // if not public user, request 'password' ie jwt token
    // start jwt/auth intercept routine
    await this.requestPassword(this.clientSocket);
  }

  /**
   * @method handlePreStartupMessage
   * @description handle the pre startup message.  Some pg wire protocol
   * messages are sent before the startup message without a message type.
   * This method handles those messages.
   * 
   * if part of the pg client connection is breaking, this is a good place
   * to check if there is part of the protocol that has been missed.
   * 
   * @param {Buffer} data binary data from the tcp client socket
   **/
  async handlePreStartupMessage(data) {
    let code = data.readInt32BE(4);

    // check for ssl request code
    if( !this.sslHandled && code === this.SSL_REQUEST ) {
      await this.handleSSLRequest();
      return;
    }
    
    // check for gssapi request code
    // this is not well documented in the docs.  This response message
    // was reverse engineered by inspecting the pg wire protocol between an active server
    if (code === this.GSSAPI_REQUEST) {
      logger.info('responding to gssapi request', this.getConnectionInfo());
      await this.writeAndWait(this.clientSocket, this.GSSAPI_RESPONSE);
      return;
    }

    // if we don't know the message, log it for debuggin
    logger.warn('unknown startup message after handling ssl request', {
      data : data.toString('hex'),
      length : data.length,
      payloadLength : data.readInt32BE(0),
      payload : data.readInt32BE(4)
    })
  }

  /**
   * @method handleSSLRequest
   * @description handle the ssl request from the client.  This method checks that TLS
   * has been enabled in the config and responds to the client with the appropriate
   * message. If TLS is enabled, the client socket is upgraded to a secure socket,
   * the secure socket is registered, the clientSocket is replaced with the secure socket.
   **/
  async handleSSLRequest() {
    logger.info('client handling ssl request', this.getConnectionInfo());
    this.sslHandled = true;

    if (!config.proxy.tls.enabled) {
      // if tls is not enabled, respond with 'N' to indicate no ssl available
      await this.writeAndWait(this.clientSocket, Buffer.from('N', 'utf8'));
    } else {
      // if tls is enabled, respond with 'S' to indicate ssl is available
      await this.writeAndWait(this.clientSocket, Buffer.from('S', 'utf8'));

      // upgrade the client socket to a secure socket
      const secureContext = tls.createSecureContext(tlsOptions);
      const secureSocket = new tls.TLSSocket(this.clientSocket, { 
        isServer: true, 
        secureContext,
        server: this.server.server
      });

      // handle secure socket data
      secureSocket.on('data', data => this.onClientSocketData(data, true));

      // register the new secure socket with the tcp server
      let sockInfo = this.server.sockets.get(this.clientSocket);
      let sessionId = sockInfo.session;
      this.server.registerConnection(secureSocket, 'incoming-secure', sessionId, this);

      // replace the client socket with the secure socket
      this.clientSocket = secureSocket;
      this.isSecureSocket = true;
    }
  }

  /**
   * @method closeSockets
   * @description close the client and server sockets.  Most of the time this is handled
   * by the underlying tcp server, but this method is available to close the sockets manually
   * if needed.
   * 
   **/
  async closeSockets() {
    if( this.clientSocket && !this.closingClientSocket ) {
      monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.CLOSING_CLIENT);
      this.closingClientSocket = true;
      try {
        await utils.closeSocket(this.clientSocket);
        logger.info('Client socket closed', this.getConnectionInfo());
      } catch(e) {
        logger.error('Error closing client socket', this.getConnectionInfo(), e);
      }
      this.clientSocket = null;
      this.closingClientSocket = false;
    }

    if( this.serverSocket && !this.closingServerSocket ) {
      monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.CLOSING_SERVER);
      this.closingServerSocket = true;
      try {
        await utils.closeSocket(this.serverSocket);
        logger.info('Server socket closed', this.getConnectionInfo());
      } catch(e) {
        logger.error('Error closing server socket', this.getConnectionInfo(), e);
      }
      this.serverSocket = null;
      this.closingServerSocket = false;
    }
  }

  /**
   * @method checkUserAccess
   * @description check if the user has access to the database.  This method
   * checks if the user is registered with the pg farm database and that the
   * database is in a running state.  Standard pg wire protocol error messages
   * are sent to the client if the user does not have access.
   * 
   * @returns {Boolean} true if the user has access to the database
   **/
  async checkUserAccess() {
    if (!this.startupProperties) return false;
    if (!this.startupProperties.database) return false;

    logger.info('Initializing server socket', this.getConnectionInfo());

    // before attempt connection, check user is registered with database
    try {
      this.ctx = await createContext({
        organization: this.dbOrganization,
        database: this.startupProperties.database,
      });

      this.pgFarmUser = await userModel.get(this.ctx, this.startupProperties.user);
    } catch (e) {}

    let userError = false;
    if( !this.pgFarmUser ) {
      userError = true;
    } else if( !this.ALLOWED_USER_TYPES.includes(this.pgFarmUser.user_type) ) {
      userError = true;
    }

    // TODO: split db error from user error
    let orgText = this.dbOrganization ? this.dbOrganization + '/' : '';
    if ( userError ) {
      await this.sendNotice(
        this.NOTICE_SEVERITY.FATAL,
        this.ERROR_CODES.INVALID_PASSWORD,
        `The username provided (${this.startupProperties.user}) is not registered with the database (${orgText}${this.startupProperties.database}) or database does not exist.`,
        null,
        null,
        this.clientSocket
      );
      return false;
    }

    if( !this.ALLOWED_INSTANCE_STATES.includes(this.pgFarmUser.instance_state) ) {
      await this.sendNotice(
        this.NOTICE_SEVERITY.ERROR,
        '57P01',
        'Instance Not Running',
        `The database (${orgText}${this.startupProperties.database}) is in a ${this.pgFarmUser.instance_state} state.`,
        'Please contact the PG Farm administrators about database access.',
        this.clientSocket
      );
      return false;
    }

    return true;
  }

  /**
   * @method createServerSocket
   * @description create a socket connection to the target postgres server
   */
  createServerSocket(fromReconnect=false) {
    return new Promise(async (resolve, reject) => {

      logger.info('Creating server socket', this.getConnectionInfo());
      monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.CREATE_SERVER_SOCKET, {fromReconnect});

      // get the instance information from the database/organization
      this.instance = this.ctx.instance;
  
      // this clients seem to be upset if you send a notice message when they don't expect it :(
      // Leaving as a TODO.  but this might not be possible.
      // if( this.instance.state !== 'RUNNING' || true ) {
      //   let orgText = this.dbOrganization ? this.dbOrganization + '/' : '';
      //   await this.sendNotice(
      //     'NOTICE',
      //     '',
      //     'Database Not Running',
      //     `The database (${orgText}${this.startupProperties.database}) is in a ${this.instance.state} state.  PG Farm is attempting to start it now.`,
      //     'It may take a moment for your connection to complete.',
      //     this.clientSocket
      //   );
      // }
  
      // ensure the instance is running
      if( fromReconnect === false ) {
        await this.startInstance();
      }

      // TODO: should we throw error if serverSocket is already set?
      this.serverSocket = this.server.createProxyConnection(
        this.instance.hostname,
        this.instance.port,
        this.clientSocket,
        this
      );

      // badness
      if( !this.serverSocket ) {
        logger.error('Error creating server socket', this.getConnectionInfo());
        this.closeSockets();
        return;
      }

      // When the target server sends data, forward it to the client
      this.serverSocket.on('data',  data => this._onServerSocketData(data));
  
      // Handle target socket connection, this resolves the wrapper promise once completed
      this.serverSocket.on('connect', () => this._onServerSocketConnect(resolve));
  
      // Handle target socket closure - multiple events for reliability
      this.serverSocket.on('close', () => this._onServerSocketClose(monitor.PROXY_EVENTS.SERVER_CLOSE));
      this.serverSocket.on('end', () => this._onServerSocketClose(monitor.PROXY_EVENTS.SERVER_END));
      this.serverSocket.on('error', (err) => {
        // logger.warn('Server socket error', this.getConnectionInfo(), err);
        this._onServerSocketClose(monitor.PROXY_EVENTS.SERVER_ERROR, err.message);
      });

      // Set server socket keepalive
      this.serverSocket.setKeepAlive(true, 30000);
    });
  }

  /**
   * @method _onServerSocketData
   * @description handle the data from the server (pg) socket
   * 
   * @param {Buffer} data binary data from the tcp server socket
   **/
  async _onServerSocketData(data) {
    this.debug('server', data);

    // check for shutdown message can capture
    // TODO: should we send this if reconnect fails??
    if (data.length && data[0] === this.MESSAGE_CODES.ERROR) {
      let error = this.parseError(data);
      monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.ERROR_MESSAGE, error);

      // if we have an error message and we are handinling jwt auth, send the error to the client
      if (this.handlingJwtAuth) {
        logger.error('PG Farm JWT connection error', {jsonPayload: error}, this.getConnectionInfo());
        await this.sendNotice(
          this.NOTICE_SEVERITY.FATAL,
          this.ERROR_CODES.CONNECTION_FAILURE,
          `PG Farm JWT connection error`,
          `An error occurred while attempting to connect to the database.  ${error.message}.  Please contact the PG Farm administrators.`,
          null,
          this.clientSocket
        );
        this.closeSockets();
        return;
      }

      // if we have a shutdown message, capture it possible use later
      if ( error.CODE === this.ERROR_CODES.ADMIN_SHUTDOWN && this.isClientSocketActive !== true ) {
        this.shutdownMsg = data;
        logger.info('Shutdown message received ignoring for now', this.getConnectionInfo());
        return;
      }
    }

    // default login flow
    if( this.handlingJwtAuth ) {
      let completed = await this.interceptServerAuth(data);
      if( completed ) {
        this.handlingJwtAuth = false;
      } else {
        return;
      }
    }

    // hijack the authentication ok message and send password to quietly 
    // reestablish connection
    if (this.awaitingReconnect) {
      let completed = await this.interceptServerAuth(data);
      if( completed ) {
        this.awaitingReconnect = null;
        this.sleepMode = null;
        this.autoCloseSockets = true;
      } 
      // always return, we don't want to send password ok message during reconnect
      return;
    }

    this.resetClientActive();

    // if not reconnect, just proxy server message to client
    await this.writeAndWait(this.clientSocket, data);
  }

  /**
   * @method _onServerSocketConnect
   * @description handle the server socket connection event.  This method
   * sends the startup message to the server once the connection is established.
   * 
   * @param {Function} resolve resolve function for the promise passed from createServerSocket
   */
  async _onServerSocketConnect(resolve) {
    logger.info('Server socket connected', this.getConnectionInfo());
    monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.SERVER_CONNECTED);

    if( !this.startUpMsgSent && this.startUpMsg  ) {
      logger.info('Sending startup message', this.getConnectionInfo());
      monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.SEND_STARTUP_MESSAGE, this.startupProperties);
      await this.writeAndWait(this.serverSocket, this.startUpMsg);
      this.startUpMsgSent = true;
    }

    if (this.awaitingReconnect && this.startUpMsg) {
      logger.info('Resending startup message', this.getConnectionInfo());
      monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.RESEND_STARTUP_MESSAGE, this.startupProperties);
      await this.writeAndWait(this.serverSocket, this.startUpMsg);
    }

    resolve();
  }

  /**
   * @method _onServerSocketClose
   * @description handle the server socket close event.  This checks if the client 
   * socket is still open and if so places connection in sleep mode.  it's important
   * we don't try to wake up the server here as it may just have a client connection
   * but no communication happening.  The reconnect will be called when the client
   * socket sends messages again.
   **/
  async _onServerSocketClose(eventType, message='no message') {
    logger.info('Server socket event', eventType, message, this.getConnectionInfo());
    monitor.logProxyConnectionEvent(this, eventType, message);

    if( this.handlingServerSocketClose || this.sleepMode ) {
      return;
    }
    this.handlingServerSocketClose = true;

    logger.info('Handling server socket close', this.getConnectionInfo());

    // if( this.serverSocket ) {
    //   this.serverSocket.destroySoon();
    // }

    // no open client socket, we are done
    if ( this.clientSocket?.readyState !== 'open' ) {
      this.handlingServerSocketClose = false;
      return;
    }

    // if we still have a client socket, and the server is unavailable, attempt reconnect
    // which will start the instance
    logger.info('Server socket closed with open client', this.getConnectionInfo());

    if( this.isClientSocketActive ) {
      logger.info('Client socket is active and server socket died, killing client socket', this.getConnectionInfo());
      this.closeSockets();
      return;
    }

    this.autoCloseSockets = false;

    // grab the current instance status from the pg farm admin database
    let instCheck = await this.getInstanceStatus();

    if( instCheck.state === 'ARCHIVE' || instCheck.state === 'ARCHIVING' ) {
      logger.info(`Instance state is ${instCheck.state}, closing client`, this.getConnectionInfo());
      this.closeSockets();
    } else {
      logger.info('Placing client connection in sleep mode', this.getConnectionInfo());
      monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.SLEEP_MODE);
      this.sleepMode = new Date();
    }

    this.handlingServerSocketClose = false;
  }

  async getInstanceStatus() {
    this.checkingPgInstStatus = true;
    let ctx = await createContext({
      database: this.startupProperties.database,
      organization: this.dbOrganization
    });
    this.checkingPgInstStatus = false;
    return ctx;
  }

  /**
   * @method reconnect
   * @description attempt to reconnect to the server.  Checks the status of the instance
   * is still in a RUN state.  This means the instance, while down, is probably just
   * being rebalanced to a new node or restarted.  Wait for the instance to come back
   * online and then attempt a silent reconnect.
   * 
   * @param {Boolean} attemptStart if true, attempt to start the instance
   **/
  async reconnect() {
    if (this.awaitingReconnect || this.checkingPgInstStatus || !this.sleepMode) {
      return;
    }

    // temporarily pause the client socket
    this.clientSocket.pause();

    this.awaitingReconnect = Date.now();
    monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.RECONNECT);

    logger.info('Attempting reconnect', this.getConnectionInfo());

    try {
      await this.startInstance();

      // wait for the instance to come back online, max 20 attempts at 2.5 seconds intervals
      logger.info('Waiting for instance tcp port', this.getConnectionInfo());
      await utils.waitUntil(this.instance.hostname, this.instance.port, 20);
    } catch (e) {

      // if we can't connect to the instance, close the connection
      logger.fatal('Reconnect failed.  Killing client connection', e, this.getConnectionInfo());
      monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.RECONNECT_FAILED);

      if (this.shutdownMsg && this.clientSocket) {
        await this.writeAndWait(this.clientSocket, this.shutdownMsg);
      }
      await utils.sleep(100);

      this.closeSockets();
      return;
    }

    logger.info('Reconnect server detected, establishing connection', this.getConnectionInfo());

    // the instance is back online, attempt to standard connection
    await this.createServerSocket(true);

    // client can send messages again
    this.clientSocket.resume();
  }

  /**
   * @method interceptServerAuth
   * @description handle the auth messages from the server.  This quietly logs
   * a userin.  So the proxy will handle these messages without the client knowing
   * about them.  Returns true if the authentication is complete.
   * 
   * @param {Buffer} data server message
   * 
   * @returns {Boolean} true if the authentication is complete
   */
  async interceptServerAuth(data) {
    // after the reconnect startup message is resent, pg will send the password message
    if (data.length && data[0] === this.MESSAGE_CODES.SEND_PASSWORD) {

      // read the authentication message typ
      let type = data.readInt32BE(5);

      // pg is asking for a password during reconnect
      if (type === this.AUTHENTICATION_CODE.CLEARTEXT_PASSWORD) {
        logger.info('Sending pg instance connect user password', this.getConnectionInfo());
        this.sendUserPassword();
        return false;

        // pg is acknowledging the password on reconnects
      } else if (type === this.AUTHENTICATION_CODE.OK) {
        logger.info('Pg instance connect authentication ok message received.', this.getConnectionInfo());

        monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.AUTHENTICATION_OK, {username: this.pgFarmUser.username});

        // if we have pending messages, send them now
        if (this.pendingMessages.length) {
          logger.info('Sending pending client messages: ', this.pendingMessages.length, this.getConnectionInfo());
          monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.SEND_PENDING_MESSAGES, {pendingMessages: this.pendingMessages.length});

          for (let msg of this.pendingMessages) {
            await this.writeAndWait(this.serverSocket, msg);
          }
          this.pendingMessages = [];
        }

        // if we have received any messages from the client while disconnected, send them now
        // logger.info('Reconnected', this.getConnectionInfo());
        return true;
      }
    }

    // possibly a bad login.  But this state needs research
    logger.info('Proxying server message during connect dance', data[0], this.getConnectionInfo());
    await this.writeAndWait(this.serverSocket, data);

    return false;
  }

  /**
   * @method parseStartupMessage
   * @description parse the first message sent by the client to 
   * postgres.  This includes connection properties such as user
   * and database.
   * 
   * @param {Buffer} data message from client 
   */
  parseStartupMessage(data) {
    if( data.length < 8 ) {
      throw new Error(`Invalid startup message, too short (${data.length}) must be at least 8 bytes.  Closing connection.`);
    }

    let offset = 0;
    let len = data.readInt32BE(offset);
    offset += 4;

    if( len !== data.length ) {
      logger.warn(`Invalid startup message, supplied length does not match message length (${len} != ${data.length}).`);
      throw new Error(`Invalid startup message, length does not match message length.  Closing connection.`);
    }

    this.version = data.readInt32BE(offset);
    offset += 4;

    let params = data.subarray(offset, data.length);
    offset = 0;

    let message = Buffer.alloc(0);
    let values = params.subarray(offset, 1);
    offset += 1;

    let last = '';
    let startupProperties = {};

    while (offset < params.length) {
      while (values[0] !== 0 && offset < params.length) {
        message = Buffer.concat([message, values]);
        values = params.subarray(offset, offset + 1);
        offset += 1;
      }

      if (last === '') {
        last = message.toString('utf8');
      } else {
        startupProperties[last] = message.toString('utf8');
        last = '';
      }

      message = Buffer.alloc(0);
      values = params.subarray(offset, offset + 1);
      offset += 1;
    }

    // there can some communication properties that should be ignored
    // TODO: handle this better
    if (Object.keys(startupProperties).length === 0) {
      this.debug('client', 'ignoring message, no properties.  Still waiting for startup.');
      return;
    } else {
      this.startupMessageHandled = true;
    }

    // check for organization in database name
    if( startupProperties.database && startupProperties.database.match('/') ) {
      let parts = startupProperties.database.split('/');
      this.dbOrganization = parts[0];
      startupProperties.database = parts[1];
    } else {
      this.dbOrganization = null;
    }

    this.startupProperties = startupProperties;

    // now create new startup message, with organization remove from database name
    offset = 0;

    // set version
    this.startUpMsg = Buffer.alloc(4);
    this.startUpMsg.writeInt32BE(this.version, 0);
    offset += 4;

    // set properties
    for (let key in startupProperties) {
      let value = startupProperties[key];
      
      this.startUpMsg = Buffer.concat([
        this.startUpMsg,
        Buffer.from(key, 'utf8'),
        Buffer.from([0]),
        Buffer.from(value, 'utf8'),
        Buffer.from([0])
      ]);
    }
    // set null
    this.startUpMsg = Buffer.concat([this.startUpMsg, Buffer.from([0])]);

    // set length
    let lenBuffer = Buffer.alloc(4);
    lenBuffer.writeInt32BE(this.startUpMsg.length+4, 0);

    this.startUpMsg = Buffer.concat([lenBuffer, this.startUpMsg]);

    return this.startUpMsg;
  }

  /**
   * @method handleJwt
   * @description handle the password message from the client.  This reads
   * the password, which should be jwt token, from the message and 
   * verifies it with keycloak.
   * 
   * @param {Buffer} data tcp message from client
   * 
   * @returns {Promise} 
   */
  async handleJwt(data) {
    logger.info('client handling jwt auth', this.getConnectionInfo());

    this.handlingJwtAuth = true;

    let offset = 1;
    // TODO; make sure the buffer is the same length as the message
    let len = data.readInt32BE(1);

    let jwt = data.subarray(5, data.length - 1).toString('utf8');

    try {
      // attempt jwt verification
      this.parsedJwt = await keycloak.verifyActiveToken(jwt);
    } catch (e) {
      // badness accessing keycloak
      await this.sendNotice(
        this.NOTICE_SEVERITY.FATAL,
        this.ERROR_CODES.CONNECTION_FAILURE,
        e.message,
        'Token Verification Error',
        '',
        this.clientSocket
      );
      return;
    }

    // user is not logged (token expired or invalid)
    if (this.parsedJwt.active !== true) {
      this.debug('invalid jwt token', {
        tokenResponse: this.parsedJwt,
        jwt
      })
      await this.sendNotice(
        this.NOTICE_SEVERITY.FATAL,
        this.ERROR_CODES.INVALID_PASSWORD,
        'The JWT token provided is not valid or has expired.',
        null,
        'Try logging in again and using the new token.',
        this.clientSocket
      );
      return;
    }

    this.jwtUsername = this.parsedJwt.user.username || this.parsedJwt.user.preferred_username;

    // create a set of roles from the jwt token
    let roles = new Set();
    (this.parsedJwt.roles || []).forEach(role => roles.add(role));
    (this.parsedJwt.realmRoles || []).forEach(role => roles.add(role));

    let userType = this.pgFarmUser.user_type;

    // if the user is an admin and the request login user is postgres, allow the connection if so below
    let isAdminAndPGuser = (
      (userType === 'ADMIN' || roles.has('admin')) &&
      this.startupProperties.user === 'postgres'
    );

    // provide pg username does not match jwt username
    if (!isAdminAndPGuser && this.jwtUsername !== this.startupProperties.user) {
      await this.sendNotice(
        this.NOTICE_SEVERITY.ERROR,
        this.ERROR_CODES.INVALID_PASSWORD,
        `The token username provided does not match the postgres username provided (${jwtUsername} ${this.startupProperties.user}).`,
        null,
        null,
        this.clientSocket
      );
      return;
    }

    // now that we have authenticated the user, open real connection to the server
    await this.createServerSocket();

    return true;
  }

  async startInstance() {
    // if we don't have a server socket, attempt to start the instance
    if( this.serverSocket?.readyState == 'open' ) return false;

    logger.info('Checking instance is up', this.getConnectionInfo());
    let resp = await admin.startInstance(this.ctx, {pgRest: false});

    if( resp.starting ) {
      await resp.instance;
    }

    if( resp.starting ) {
      logger.info('Instance started', this.getConnectionInfo());
      monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.INSTANCE_START);
    } else {
      logger.info('Instance already running', this.getConnectionInfo());
    }
  }

  /**
   * @method sendUserPassword
   * @description send the user's pg farm password to the server.
   * 
   * @returns {Promise}
   */
  async sendUserPassword() {
    logger.info('Sending user pgfarm password to pg instance', this.getConnectionInfo());
    monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.SEND_PASSWORD);

    let password = config.proxy.password.static;
    if (config.proxy.password.type === 'pg') {
      password = this.pgFarmUser.password;
    }

    await this.sendPassword(password, this.serverSocket);
  }

  /**
   * @method sendPassword
   * @description send a password on a socket in the pg wire format
   * 
   * @param {String} password 
   * @param {Socket} socket 
   */
  sendPassword(password, socket) {
    let pLen = Buffer.byteLength(password);

    // code + len(32bit) + pass + null
    let passBuffer = Buffer.alloc(1 + 4 + pLen + 1);
    passBuffer[0] = this.MESSAGE_CODES.PASSWORD;
    passBuffer.writeInt32BE(4 + pLen + 1, 1);
    passBuffer.write(password, 5);

    return this.writeAndWait(socket, passBuffer);
  }

  /**
   * @method requestPassword
   * @description request a password from the client in the pg wire format
   * 
   * @param {Socket} socket client socket 
   */
  requestPassword(socket) {
    let passBuffer = Buffer.alloc(1 + 4 + 4);
    passBuffer[0] = this.MESSAGE_CODES.SEND_PASSWORD;
    passBuffer.writeInt32BE(4+4, 1);
    passBuffer.writeInt32BE(this.AUTHENTICATION_CODE.CLEARTEXT_PASSWORD, 5);
    return this.writeAndWait(socket, passBuffer);
  }

  async onShutdown() {
    logger.info('Proxy connection shutting down', this.getConnectionInfo());

    await this.sendNotice(
      this.NOTICE_SEVERITY.FATAL,
      this.ERROR_CODES.ADMIN_SHUTDOWN,
      'Connection closing.',
      'PG Farm is closing your connection, please try reconnecting shortly.',
      'PG Farm probably needs to restart, this will only take a moment',
      this.clientSocket
    );

    this.closeSockets();
  }

  /**
   * @method sendNotice
   * @description send a notice or error message on a socket in the pg wire format
   * depending on the severity of the message.
   * 
   * https://www.postgresql.org/docs/current/protocol-error-fields.html
   * 
   * @param {String} severity 
   * @param {String} code 
   * @param {String} message 
   * @param {String} detail 
   * @param {String} hint 
   * @param {Socket} socket 
   * 
   * @returns {Promise}
   */
  sendNotice(severity, code, message = '', detail = '', hint = '', socket) {
    if( typeof severity === 'object' ) {
      let obj = severity;
      severity = obj.severity;
      code = obj.code;
      message = obj.message;
      detail = obj.detail;
      hint = obj.hint;
      socket = obj.socket;
    }

    logger.debug('Sending notice to client', {severity, code, message, detail, hint});
    // TODO: add back in as stats
    // this.emitStat(severity.toLowerCase(), {
    //   severity,
    //   code,
    //   message
    // });

    // two extra bytes.  one for the message code and one for the ending null
    let mLen = Buffer.byteLength(severity) + 2 +
      Buffer.byteLength(code) + 2;

    if( message ) mLen += Buffer.byteLength(message) + 2;
    if( detail ) mLen += Buffer.byteLength(detail) + 2;
    if( hint ) mLen += Buffer.byteLength(hint) + 2;

    // code + len(32bit) + e code + error detail + null
    let eBuffer = Buffer.alloc(1 + 4 + mLen + 1);

    let msgCode;
    if (this.NOTICE_ERROR_SEVERITIES.includes(severity)) {
      msgCode = this.MESSAGE_CODES.ERROR; // E - message code
    } else {
      msgCode = this.MESSAGE_CODES.NOTICE; // N - message code
    }

    let offset = 0;
    eBuffer[offset] = msgCode; 
    offset++;

    eBuffer.writeInt32BE(4 + mLen + 1, offset); // msg length
    offset += 4;

    eBuffer[offset] = this.ERROR_MSG_FIELDS.SEVERITY;
    offset++;
    eBuffer.write(severity, offset);
    offset += Buffer.byteLength(severity) + 1;

    // only send pg wire error code if it's an error
    if( msgCode === this.MESSAGE_CODES.ERROR ) {
      eBuffer[offset] = this.ERROR_MSG_FIELDS.CODE;
      offset++;
      eBuffer.write(code, offset);
      offset += Buffer.byteLength(code) + 1;
    }

    if( message ) {
      eBuffer[offset] = this.ERROR_MSG_FIELDS.MESSAGE;
      offset++;
      eBuffer.write(message, offset);
      offset += Buffer.byteLength(message) + 1;
    }

    if( detail ) {
      eBuffer[offset] = this.ERROR_MSG_FIELDS.DETAIL;
      offset++;
      eBuffer.write(detail, offset);
      offset += Buffer.byteLength(detail) + 1;
    }

    if( hint ) {
      eBuffer[offset] = this.ERROR_MSG_FIELDS.HINT;
      offset++;
      eBuffer.write(hint, offset);
      offset += Buffer.byteLength(hint) + 1;
    }

    return this.writeAndWait(socket, eBuffer);
  }

  /**
   * @method writeAndWait
   * @description write data to a socket and wait for it to drain
   * if required, pause the 'other' socket if we encounter backpressure.
   *
   * @param {Socket} socket socket to write to
   * @param {Buffer} data data to write
   * @returns {Promise}
   */
  writeAndWait(socket, data) {
    let isServerSocket = (socket === this.serverSocket);

    // determine which socket is being used
    // only required for debug logging
    let socketLabel;
    if( this.isDebugLogLevel ) {
      socketLabel = isServerSocket ? 'serverSocket' : 'clientSocket';
    }

    if( isServerSocket ) {
      this.pendingMessages.push(data);
    }

    return new Promise((resolve, reject) => {
      const canWrite = socket.write(data, err => {
        if ( !err && isServerSocket ) {
          let index = this.pendingMessages.indexOf(data);
          if (index !== -1) {
            this.pendingMessages.splice(index, 1);
          }
        }
      });

      if (canWrite) {
        resolve(); // buffer still has space
      } else {

        // checking log level so we don't lookup connection info if not needed
        if( this.isDebugLogLevel ) {
          logger.debug('Socket buffer full, waiting for drain, socketLabel=', socketLabel, this.getConnectionInfo());
        }

        // find alternate socket, the one not being written to so we can pause
        let altSocket;
        if( this.serverSocket === socket ) {
          altSocket = this.clientSocket;
        } else if( this.clientSocket === socket ) {
          altSocket = this.serverSocket;
        }

        // pause the alternate socket to prevent it from sending data while
        // we wait for the backpressure to clear 'drain event'
        altSocket.pause();

        // now wait for the drain event
        socket.once('drain', () => {
          if( this.isDebugLogLevel ) {
            logger.debug('Socket buffer drained, resuming, socketLabel=', socketLabel, this.getConnectionInfo());
          }

          // resume the alternate socket
          altSocket.resume();

          // ok to write again
          resolve();
        });
      }
    });
  }

  /**
   * @method parseError
   * @description parse an pg wire format error message
   * 
   * @param {Buffer} data binary data from the tcp server socket
   *  
   * @returns {Object}
   */
  parseError(data) {
    if (!data.length) return null;
    if (data[0] !== this.MESSAGE_CODES.ERROR) {
      return null;
    }

    let offset = 1;
    let len = data.readInt32BE(offset);
    offset += 4;

    let fields = data.subarray(offset, data.length);
    offset = 0;

    let error = {};

    while (offset < fields.length) {
      let code = fields[offset];
      let start = offset;
      offset += 1;

      let found = false;
      for (let key in this.ERROR_MSG_FIELDS) {
        if (this.ERROR_MSG_FIELDS[key] === code) {
          code = key;
          found = true;
          break;
        }
      }
      if (!found) code = fields.subarray(start, offset).toString('hex');

      while (fields[offset] !== 0 && offset < fields.length) {
        offset += 1;
      }
      let message = fields.subarray(start + 1, offset).toString('utf8');

      if (code == '00' && message.toString('utf8') === '') {
        offset += 1;
        continue;
      }

      error[code] = message.toString('utf8');
      offset += 1;
    }

    return error;
  }

  /**
   * @method debug
   * @description low level debugging of the raw socket data.  logs the
   * sender (client/server) as well as the data in both hex and utf8.
   * To see this both PROXY_DEBUG=true and LOG_LEVEL=debug flags need
   * to be set.
   * 
   * @param {Socket} socket 
   * @param {Buffer} data 
   */
  debug(socket, data) {
    if (!this.debugEnabled) return;

    if (data instanceof Buffer) {
      logger.info({
        socket,
        data: '0x' + data.toString('hex'),
        string: data.toString('utf8')
      });
    } else {
      logger.info({
        socket,
        message: data
      });
    }
  }

  /**
   * @method emitStat
   * @description emit a stat event for metrics collection
   **/
  emitStat(type, data) {
    this.emit('stat', {
      type,
      data
    });
  }

}

export default ProxyConnection;