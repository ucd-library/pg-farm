import tls from 'tls';
import fs from 'fs';
import keycloak from '../../../lib/keycloak.js';
import config from '../../../lib/config.js';
import utils from '../../../lib/utils.js';
import logger from '../../../lib/logger.js';
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

    // have we sent the clients startup message
    this.startupMessageHandled = false; 

    // if ssl request has been handled
    this.sslHandled = false; 

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
      INVALID_PASSWORD: '28P01'
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
      session: this.sessionId
    };
    if( this.clientSocket ) {
      info.clientSocket = this.clientSocket.readyState;
    }
    if( this.serverSocket ) {
      info.serverSocket = this.serverSocket.readyState;
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
    logger.info('proxy handling new connection', this.clientSocket.remoteAddress);

    // When the client sends data, forward it to the target server
    this.clientSocket.on('data', data => this.onClientSocketData(data));

    // Handle client socket closure
    this.clientSocket.on('close', () => this.onClientSocketClose());
  }

  /**
   * @method onClientSocketClose
   */
  onClientSocketClose() {
    monitor.onClientDisconnect(this);
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

      // check for SSL and special auth messages
      if (!this.startupMessageHandled && data.length == 8 ) { 
        this.handlePreStartupMessage(data);
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
          this.pgFarmUser?.user_type !== 'PUBLIC') {
        await this.handleJwt(data);
        return;
      }

      // check for query message, if so, emit stats
      if (data.length && data[0] === this.MESSAGE_CODES.QUERY) {
        monitor.onQuery(this.pgFarmUser.database_id);
      }

      // else, just proxy message
      this.serverSocket.write(data);
    } catch(e) {
      logger.error('Error handling client data', this.getConnectionInfo(), e);
      this.closeSockets();
    }
  }

  /**
   * @method handleStartupMessage
   * @description handle the startup message from the pg client.
   * This message provides the connection properties such as user and database.
   **/
  async handleStartupMessage(data) {
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
    this.requestPassword(this.clientSocket);
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
  handlePreStartupMessage(data) {
    let code = data.readInt32BE(4);

    // check for ssl request code
    if( !this.sslHandled && code === this.SSL_REQUEST ) {
      this.handleSSLRequest();
      return;
    }
    
    // check for gssapi request code
    // this is not well documented in the docs.  This response message
    // was reverse engineered by inspecting the pg wire protocol between an active server
    if (code === this.GSSAPI_REQUEST) {
      logger.info('responding to gssapi request', this.getConnectionInfo());
      this.clientSocket.write(this.GSSAPI_RESPONSE);
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
  handleSSLRequest() {
    logger.info('client handling ssl request', this.getConnectionInfo());
    this.sslHandled = true;

    if (!config.proxy.tls.enabled) {
      // if tls is not enabled, respond with 'N' to indicate no ssl available
      this.clientSocket.write(Buffer.from('N', 'utf8'));
    } else {
      // if tls is enabled, respond with 'S' to indicate ssl is available
      this.clientSocket.write(Buffer.from('S', 'utf8'));

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
      this.pgFarmUser = await userModel.get(
        this.startupProperties.database,
        this.dbOrganization,
        this.startupProperties.user
      );
    } catch (e) {}

    let userError = false;
    if( !this.pgFarmUser ) {
      userError = true;
    } else if( !this.ALLOWED_USER_TYPES.includes(this.pgFarmUser.user_type) ) {
      userError = true;
    }

    let orgText = this.dbOrganization ? this.dbOrganization + '/' : '';
    if ( userError ) {
      this.sendNotice(
        'ERROR',
        '28P01',
        'Invalid Username',
        `The username provided (${this.startupProperties.user}) is not registered with the database (${orgText}${this.startupProperties.database}).`,
        'Make sure you are using the correct username and that your account has been registered with PG Farm.',
        this.clientSocket
      );
      return false;
    }

    if( !this.ALLOWED_INSTANCE_STATES.includes(this.pgFarmUser.instance_state) ) {
      this.sendNotice(
        'ERROR',
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
      this.instance = await instance.getByDatabase(
        this.startupProperties.database,
        this.dbOrganization
      );
  
      // this clients seem to be upset if you send a notice message when they don't expect it :(
      // Leaving as a TODO.  but this might not be possible.
      // if( this.instance.state !== 'RUNNING' || true ) {
      //   let orgText = this.dbOrganization ? this.dbOrganization + '/' : '';
      //   this.sendNotice(
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
        this.clientSocket
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
  
      // Handle target socket closure
      this.serverSocket.on('close', () => this._onServerSocketClose());
    });
  }

  /**
   * @method _onServerSocketData
   * @description handle the data from the server (pg) socket
   * 
   * @param {Buffer} data binary data from the tcp server socket
   **/
  _onServerSocketData(data) {
    this.debug('server', data);

    // check for shutdown message can capture
    // TODO: should we send this if reconnect fails??
    if (data.length && data[0] === this.MESSAGE_CODES.ERROR) {
      let error = this.parseError(data);
      monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.ERROR_MESSAGE, error);

      // if we have a shutdown message, capture it possible use later
      if (error.CODE === this.ERROR_CODES.ADMIN_SHUTDOWN) {
        this.shutdownMsg = data;
        logger.info('Shutdown message received ignoring for now', this.getConnectionInfo());
        return;
      }
    }

    // default login flow
    if( this.handlingJwtAuth ) {
      let completed = this.interceptServerAuth(data);
      if( completed ) {
        this.handlingJwtAuth = false;
      } else {
        return;
      }
    }

    // hijack the authentication ok message and send password to quietly 
    // reestablish connection
    if (this.awaitingReconnect) {
      let completed = this.interceptServerAuth(data);
      if( completed ) {
        this.awaitingReconnect = null;
        this.sleepMode = null;
        this.autoCloseSockets = true;
      } 
      // always return, we don't want to send password ok message during reconnect
      return;
    }

    // if not reconnect, just proxy server message to client
    this.clientSocket.write(data);
  }

  /**
   * @method _onServerSocketConnect
   * @description handle the server socket connection event.  This method
   * sends the startup message to the server once the connection is established.
   * 
   * @param {Function} resolve resolve function for the promise passed from createServerSocket
   */
  _onServerSocketConnect(resolve) {
    logger.info('Server socket connected', this.getConnectionInfo());
    monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.SERVER_CONNECTED);

    if( !this.startUpMsgSent && this.startUpMsg  ) {
      logger.info('Sending startup message', this.getConnectionInfo());
      monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.SEND_STARTUP_MESSAGE, this.startupProperties);
      this.serverSocket.write(this.startUpMsg);
      this.startUpMsgSent = true;
    }

    if (this.awaitingReconnect && this.startUpMsg) {
      logger.info('Resending startup message', this.getConnectionInfo());
      monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.RESEND_STARTUP_MESSAGE, this.startupProperties);
      this.serverSocket.write(this.startUpMsg);
    }

    resolve();
  }

  /**
   * @method _onServerSocketClose
   * @description handle the server socket close event.  This checks if the client 
   * socket is still open and if so, attempts a reconnect to the server.
   **/
  async _onServerSocketClose() {
    this.serverSocket.destroySoon();
    monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.SERVER_CLOSE);

    // if we still have a client socket, and the server is unavailable, attempt reconnect
    // which will start the instance
    if ( this.clientSocket?.readyState !== 'open' ) return;

    logger.info('Server socket closed with open client', this.getConnectionInfo());
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
  }

  async getInstanceStatus() {
    this.checkingPgInstStatus = true;
    let instStatus = await instance.getByDatabase(
      this.startupProperties.database,
      this.dbOrganization
    );
    this.checkingPgInstStatus = false;
    return instStatus;
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

    monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.RECONNECT);
    this.awaitingReconnect = Date.now();

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
        this.clientSocket.write(this.shutdownMsg);
      }
      await utils.sleep(100);

      this.closeSockets();
      return;
    }

    logger.info('Reconnect server detected, establishing connection', this.getConnectionInfo());

    // the instance is back online, attempt to standard connection
    await this.createServerSocket(true);
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
  interceptServerAuth(data) {
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

        // this.emitStat('client-connection', {
        //   startupProperties: this.startupProperties,
        //   user: this.pgFarmUser,
        //   remoteAddress : this.clientSocket.remoteAddress,
        //   serverId : this.server.id
        // });

        // if we have pending messages, send them now
        if (this.pendingMessages.length) {
          logger.info('Sending pending client messages: ', this.pendingMessages.length, this.getConnectionInfo());
          monitor.logProxyConnectionEvent(this, monitor.PROXY_EVENTS.SEND_PENDING_MESSAGES, {pendingMessages: this.pendingMessages.length});

          for (let msg of this.pendingMessages) {
            this.serverSocket.write(msg);
          }
          this.pendingMessages = [];
        }

        // if we have received any messages from the client while disconnected, send them now
        logger.info('Reconnected', this.getConnectionInfo());
        return true;
      }
    }

    // possibly a bad login.  But this state needs research
    logger.info('Proxying server message during connect dance', data[0], this.getConnectionInfo());
    this.serverSocket.write(data);

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
      this.sendNotice(
        'ERROR',
        this.ERROR_CODES.CONNECTION_FAILURE,
        e.message,
        'JWT Verification Error',
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
      this.sendNotice(
        'ERROR',
        this.ERROR_CODES.INVALID_PASSWORD,
        'Invalid JWT Token',
        'The JWT token provided is not valid or has expired.',
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
      this.sendNotice(
        'ERROR',
        this.ERROR_CODES.INVALID_PASSWORD,
        'Invalid JWT Token',
        `The JWT token username provided does not match the postgres username provided (${jwtUsername} ${this.startupProperties.user}).`,
        'Make sure your username matches your JWT token (CAS Username).',
        this.clientSocket
      );
      return;
    }

    // now that we have authenticated the user, open real connection to the server
    await this.createServerSocket();
  }

  async startInstance() {
    // if we don't have a server socket, attempt to start the instance
    if( this.serverSocket?.readyState == 'open' ) return false;

    logger.info('Checking instance is up', this.getConnectionInfo());
    let started = await admin.startInstance(
      this.startupProperties.database, 
      this.dbOrganization
    );
    if( started ) {
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

    this.sendPassword(password, this.serverSocket);
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

    socket.write(passBuffer);
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
    socket.write(passBuffer);
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
   */
  sendNotice(severity, code, message, detail = '', hint = '', socket) {
    logger.info('Sending notice to client', {severity, code, message, detail, hint});
    // TODO: add back in as stats
    // this.emitStat(severity.toLowerCase(), {
    //   severity,
    //   code,
    //   message
    // });

    // two extra bytes.  one for the message code and one for the ending null
    let mLen = Buffer.byteLength(severity) + 2 +
      Buffer.byteLength(code) + 2 +
      Buffer.byteLength(message) + 2 +
      Buffer.byteLength(detail) + 2 +
      Buffer.byteLength(hint) + 2;

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

    eBuffer[offset] = this.ERROR_MSG_FIELDS.MESSAGE;
    offset++;
    eBuffer.write(message, offset);
    offset += Buffer.byteLength(message) + 1;

    eBuffer[offset] = this.ERROR_MSG_FIELDS.DETAIL;
    offset++;
    eBuffer.write(detail, offset);
    offset += Buffer.byteLength(detail) + 1;

    eBuffer[offset] = this.ERROR_MSG_FIELDS.HINT;
    offset++;
    eBuffer.write(hint, offset);
    offset += Buffer.byteLength(hint) + 1;

    socket.write(eBuffer);
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
    console.log('debug', this.debugEnabled);
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