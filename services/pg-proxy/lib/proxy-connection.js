import tls from 'tls';
import { EventEmitter } from 'node:events';
import keycloak from '../../lib/keycloak.js';
import config from '../../lib/config.js';
import utils from '../../lib/utils.js';
import logger from '../../lib/logger.js';
import adminClient from '../../lib/pg-admin-client.js';
import adminModel from '../../administration/src/models/admin.js';
import instanceStart from '../../lib/instance-start.js';

// let pgPassConnection = null;
// if( config.proxy.password.type === 'pg' ) {
//   pgPassConnection = new PG.Pool({
//     user : config.proxy.password.user,
//     host : config.proxy.password.host,
//     database : config.proxy.password.database,
//     password : config.proxy.password.password,
//     port : config.proxy.password.port
//   });
// }

const tlsOptions = {
  // Your TLS options go here, such as key, cert, etc.
  // For example:
  key: '',
  cert: ''
};

class ProxyConnection extends EventEmitter {

  constructor(clientSocket, server) {
    super();

    this.clientSocket = clientSocket;
    this.server = server;
    this.firstMessage = true;
    this.targetPort = config.proxy.targetPort;

    this.SSL_REQUEST = 0x04D2162F;

    this.ALLOWED_USER_TYPES = ['ADMIN', 'USER', 'PUBLIC'];

    this.MESSAGE_CODES = {
      PASSWORD: 0x70,
      SEND_PASSWORD: 0x52,
      ERROR: 0x45,
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

    this.debugEnabled = config.proxy.debug;
    if( this.debugEnabled ) {
      logger.warn('Proxy debug enabled');
    }


    // for replaying startup message on reconnect
    this.startUpMsg = null;
    this.shutdownMsg = null;
    this.pendingMessages = [];
    this.awaitingReconnect = null;

    this.init();
  }

  getConnectionInfo() {
    let info = {};
    if( this.clientSocket ) {
      info.client = this.clientSocket.remoteAddress;
    }
    if( this.serverSocket ) {
      info.server = this.serverSocket.remoteAddress;
    }
    if( this.startupProperties ) {
      info.database = this.startupProperties.database;
      info.user = this.startupProperties.user;
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
    this.clientSocket.on('data', async data => {
      this.debug('client', data);

      // if we are attempting reconnect, just buffer the message
      if (this.awaitingReconnect) {
        this.pendingMessages.push(data);
        return;
      }

      // check for SSL message
      if (this.firstMessage &&
        data.length >= 4 &&
        data.readInt32BE(4) === this.SSL_REQUEST) {

        logger.info('client handling ssl request', this.getConnectionInfo());

        if (!config.proxy.tls.enabled) {
          this.clientSocket.write(Buffer.from('N', 'utf8'));
        } else {
          this.clientSocket.write(Buffer.from('S', 'utf8'));
          new tls.TLSSocket(this.clientSocket, tlsOptions);
        }

        return;
      }

      // first message provides the connection properties
      if (this.firstMessage) {
        logger.info('client handling startup message', data.length, this.getConnectionInfo());
        this.parseStartupMessage(data);
        logger.info('startup message parsed', this.getConnectionInfo());

        try {
          // this checks if user has access to database
          let success = await this.initServerSocket();
          if (!success) {
            logger.info('invalid user access, closing connection', this.getConnectionInfo());
            this.closeSockets();
            return;
          }

          this.server.setSocketProperties(this.clientSocket, {
            hostname: this.instance.hostname,
            database: this.startupProperties.database,
            user: this.startupProperties.user
          });

          this.server.setSocketProperties(this.serverSocket, {
            hostname: this.instance.hostname,
            database: this.startupProperties.database,
            user: this.startupProperties.user
          });

        } catch (e) {
          logger.error('Error initializing server socket', this.getConnectionInfo(), e);
          this.closeSockets();
          return;
        }

        // now just proxy messsage
        logger.info('client startup message parsed', this.getConnectionInfo());
      }

      // intercept the password message and handle it
      if (data.length && data[0] === this.MESSAGE_CODES.PASSWORD) {

        // TODO: currently I'm just allowing the known public user to login with a
        // password.  Should I let any user marked as public in??
        if( this.startupProperties.user !== config.pgInstance.publicRole.username ) {
          logger.info('client handling jwt auth', this.getConnectionInfo());
          this.handleJwt(data);
          return;
        } else {
          logger.info(`Public user ${this.startupProperties.user} logging in with a direct proxy of password`, this.getConnectionInfo());
        }
      }

      // check for query message, if so, emit stats
      if (data.length && data[0] === this.MESSAGE_CODES.QUERY) {
        this.emitStat('query', {database: this.startupProperties.database});
      }

      // else, just proxy message
      this.serverSocket.write(data);
    });
  }

  async closeSockets() {
    if( this.clientSocket && !this.closingClientSocket ) {
      this.closingClientSocket = true;
      try {
        await utils.closeSocket(this.clientSocket);
        logger.info('Client socket closed', this.getConnectionInfo());
        // this.emitStat('socket-closed', {socket: 'client'});
      } catch(e) {
        logger.error('Error closing client socket', this.getConnectionInfo(), e);
      }
      this.clientSocket = null;
      this.closingClientSocket = false;
    }

    if( this.serverSocket && !this.closingServerSocket ) {
      this.closingServerSocket = true;
      try {
        await utils.closeSocket(this.serverSocket);
        logger.info('Server socket closed', this.getConnectionInfo());
        // this.emitStat('socket-closed', {socket: 'server'});
      } catch(e) {
        logger.error('Error closing server socket', this.getConnectionInfo(), e);
      }
      this.serverSocket = null;
      this.closingServerSocket = false;
    }
  }

  async initServerSocket() {
    if (!this.startupProperties) return;
    if (!this.startupProperties.database) return;

    logger.info('Initializing server socket', this.getConnectionInfo());

    // before attempt connection, check user is registered with database
    let user;
    try {
      user = await adminClient.getUser(
        this.startupProperties.database,
        this.startupProperties.user
      );
    } catch (e) { }

    let userError = false;
    if( !user ) {
      userError = true;
    } else if( !this.ALLOWED_USER_TYPES.includes(user.type) ) {
      userError = true;
    }

    if ( userError ) {
      this.sendError(
        'ERROR',
        '28P01',
        'Invalid Username',
        `The username provided (${this.startupProperties.user}) is not registered with the database (${this.startupProperties.database}).`,
        'Make sure you are using the correct username and that your account has been registered with PG Farm.',
        this.clientSocket
      );
      return false;
    }

    this.instance = await adminClient.getInstance(this.startupProperties.database);

    let startTime = Date.now();
    let started = await instanceStart.start(
      this.startupProperties.database, 
      this.instance
    )

    if( started === true ) {
      this.emitStat('instance-start', {
        database: this.instance.name,
        hostname: this.instance.hostname,
        port: this.instance.port,
        time: Date.now() - startTime
      });
    }

    await this.createServerSocket();

    return true;
  }

  /**
   * @method createServerSocket
   * @description create a socket connection to the target postgres server
   */
  createServerSocket() {
    return new Promise((resolve, reject) => {
      let first = true;

      this.serverSocket = this.server.createProxyConnection(
        this.instance.hostname,
        this.instance.port,
        this.clientSocket
      );
  
      // When the target server sends data, forward it to the client
      this.serverSocket.on('data', async data => {
        this.debug('server', data);
  
        // check for shutdown message can capture
        // TODO: should we send this if reconnect fails??
        if (data.length && data[0] === this.MESSAGE_CODES.ERROR) {
          let error = this.parseError(data);
          if (error.CODE === this.ERROR_CODES.ADMIN_SHUTDOWN) {
            this.shutdownMsg = data;
            logger.info('Ignoring admin shutdown message, reconnect in progress', (this.awaitingReconnect ? true : false));
            // we will handle later
            return;
          }
        }
  
        // hijack the authentication ok message and send password to quietly 
        // reestablish connection
        if (this.awaitingReconnect) {
          this.handleReconnectServerMessage(data);
  
          // if not a password message, just ignore during reconnect
          return;
        }
  
        // if not reconnect, just proxy server message to client
        this.clientSocket.write(data);
      });
  
      this.serverSocket.on('connect', () => {
        if( first ) {
          resolve();
          first = false;
        }

        if (this.awaitingReconnect) {
          logger.info('Resending startup message', this.instance.name, this.instance.port, this.startupProperties.user);
          this.serverSocket.write(this.startUpMsg);
        }
      });
  
  
      // Handle target socket closure
      this.serverSocket.on('close', async () => {
        // logger.info('Server socket end event', this.getConnectionInfo());
  
        // if we still have a client socket, and the server is unavailable, attempt reconnect
        // which will start the instance
        if ( this.clientSocket?.readyState === 'open' ) {
          let isAlive = await utils.isAlive(this.instance.hostname, this.instance.port);
          if( !isAlive ) {
            this.emitStat('socket-closed', {socket: 'server'});
            this.serverSocket.destroy();
            this.reconnect();
            return;
          }
        }
      });
    });
  }

  async reconnect() {
    if (this.awaitingReconnect) {
      return;
    }

    this.emitStat('socket-reconnect', 1);
    this.awaitingReconnect = Date.now();

    logger.info('Attempting reconnect', this.instance.name, this.instance.port);

    try {
      logger.info('Starting instance', this.instance.name);
      await adminModel.startInstance(this.instance.name);

      logger.info('Waiting for instance tcp port', this.instance.name);
      await utils.waitUntil(this.instance.hostname, this.instance.port, 20);
    } catch (e) {
      logger.fatal('Reconnect failed.  Killing client connection', this.instance.name, this.instance.port);
      if (this.shutdownMsg && this.clientSocket) {
        this.clientSocket.write(this.shutdownMsg);
      }
      await utils.sleep(100);

      this.closeSockets();
      return;
    }

    logger.info('Reconnect server detected, establishing connection', this.instance.name, this.instance.port);

    this.createServerSocket();
  }

  /**
   * @method handleReconnectServerMessage
   * @description handle the reconnect messages from the server.  This quietly logs
   * a user back in.  So the proxy will handle these messages without the client knowing
   * about them
   * 
   * @param {Buffer} data 
   */
  handleReconnectServerMessage(data) {
    // after the reconnect startup message is resent, pg will send the password message
    if (data.length && data[0] === this.MESSAGE_CODES.SEND_PASSWORD) {

      // read the authentication message typ
      let type = data.readInt32BE(5);

      // pg is asking for a password during reconnect
      if (type === this.AUTHENTICATION_CODE.CLEARTEXT_PASSWORD) {
        logger.info('Sending reconnect user password');
        this.sendUserPassword();

        // pg is acknowledging the password on reconnects
      } else if (type === this.AUTHENTICATION_CODE.OK) {
        logger.info('Reconnect authentication ok message received.');

        if (this.pendingMessages.length) {
          logger.info('Sending pending client messages: ', this.pendingMessages.length);
        }

        // if we have received any messages from the client while disconnected, send them now
        this.awaitingReconnect = null;
        for (let msg of this.pendingMessages) {
          this.serverSocket.write(msg);
        }
        this.pendingMessages = [];

        logger.info('Reconnected', this.instance.name, this.instance.port);
      }
    }
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
    this.startUpMsg = data;

    let offset = 0;
    let len = data.readInt32BE(offset);
    offset += 4;

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
      this.firstMessage = false;
    }

    this.startupProperties = startupProperties;
  }

  /**
   * @method handleJwt
   * @description handle the password message from the client.  This reads
   * the password, which should be jwt token, from the message and 
   * verifies it with keycloak.
   * 
   * @param {*} data 
   * @returns {Promise} 
   */
  async handleJwt(data) {

    let offset = 1;
    // TODO; make sure the buffer is the same length as the message
    let len = data.readInt32BE(1);

    let jwt = data.subarray(5, data.length - 1).toString('utf8');


    try {
      // attempt jwt verification
      this.parsedJwt = await keycloak.verifyActiveToken(jwt);
    } catch (e) {
      // badness accessing keycloak
      this.sendError(
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
      this.sendError(
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
    let roles = new Set();
    (this.parsedJwt.roles || []).forEach(role => roles.add(role));
    (this.parsedJwt.realmRoles || []).forEach(role => roles.add(role));

    let user = await adminClient.getUser(
      this.startupProperties.database,
      this.startupProperties.user
    );

    let isAdminAndPGuser = (
      (user.type === 'ADMIN' || roles.has('admin')) &&
      this.startupProperties.user === 'postgres'
    );

    // provide pg username does not match jwt username
    if (!isAdminAndPGuser && this.jwtUsername !== this.startupProperties.user) {
      this.sendError(
        'ERROR',
        this.ERROR_CODES.INVALID_PASSWORD,
        'Invalid JWT Token',
        `The JWT token username provided does not match the postgres username provided (${jwtUsername} ${this.startupProperties.user}).`,
        'Make sure your username matches your JWT token (CAS Username).',
        this.clientSocket
      );
      return;
    }

    await this.sendUserPassword();
  }

  /**
   * @method sendUserPassword
   * @description send the user's pg farm password to the server.
   * 
   * @returns {Promise}
   */
  async sendUserPassword() {
    let password = config.proxy.password.static;
    if (config.proxy.password.type === 'pg') {
      let user = await adminClient.getUser(this.instance.name, this.startupProperties.user);
      password = user.password;
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
   * @method sendError
   * @description send an error message on a socket in the pg wire format
   * 
   * @param {String} severity 
   * @param {String} code 
   * @param {String} message 
   * @param {String} detail 
   * @param {String} hint 
   * @param {Socket} socket 
   */
  sendError(severity, code, message, detail = '', hint = '', socket) {
    this.emitStat('error', {
      severity,
      code,
      message
    });

    // two extra bytes.  one for the message code and one for the ending null
    let mLen = Buffer.byteLength(severity) + 2 +
      Buffer.byteLength(code) + 2 +
      Buffer.byteLength(message) + 2 +
      Buffer.byteLength(detail) + 2 +
      Buffer.byteLength(hint) + 2;

    // code + len(32bit) + e code + error detail + null
    let eBuffer = Buffer.alloc(1 + 4 + mLen + 1);

    let offset = 0;
    eBuffer[offset] = this.MESSAGE_CODES.ERROR; // E - message code
    offset++;

    eBuffer.writeInt32BE(4 + mLen + 1, offset); // msg length
    offset += 4;

    eBuffer[offset] = this.ERROR_MSG_FIELDS.SEVERITY;
    offset++;
    eBuffer.write(severity, offset);
    offset += Buffer.byteLength(severity) + 1;

    eBuffer[offset] = this.ERROR_MSG_FIELDS.CODE;
    offset++;
    eBuffer.write(code, offset);
    offset += Buffer.byteLength(code) + 1;

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
   * @param {Buffer} data
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

  emitStat(type, data) {
    this.emit('stat', {
      type,
      data
    });
  }

}

export default ProxyConnection;