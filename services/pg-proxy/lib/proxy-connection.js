import PG from 'pg';
import net from 'net';
import { EventEmitter } from 'node:events';
import keycloak from '../../lib/keycloak.js';
import config from '../../lib/config.js';
import waitUntil from '../../administration/src/lib/wait-util.js';
import adminModel from '../../administration/src/models/admin.js';

let pgPassConnection = null;
if( config.proxy.password.type === 'pg' ) {
  pgPassConnection = new PG.Pool({
    user : config.proxy.password.user,
    host : config.proxy.password.host,
    database : config.proxy.password.database,
    password : config.proxy.password.password,
    port : config.proxy.password.port
  });
}


class ProxyConnection extends EventEmitter {

  constructor(clientSocket, serverSocket) {
    super();

    this.clientSocket = clientSocket;
    this.serverSocket = serverSocket;
    this.firstMessage = true;
    this.targetPort = config.proxy.targetPort;

    this.SSL_REQUEST = 0x04D2162F;

    this.MESSAGE_CODES = {
      PASSWORD : 0x70,
      ERROR : 0x45,
      QUERY : 0x51
    }
    this.ERROR_CODES = {
      // https://www.postgresql.org/docs/current/protocol-error-fields.html
      SEVERITY : 0x53,
      CODE : 0x43,
      MESSAGE : 0x4d,
      DETAIL : 0x44,
      HINT : 0x48
    }

    this.debugEnabled = config.proxy.debug === 'true';


    this.init();
  }

  /**
   * @method init
   * @description setup this socket listeners for data, error, and end
   * events.
   * 
   */
  init() {
    this.debug('proxy', 'handling new connection');

    // When the client sends data, forward it to the target server
    this.clientSocket.on('data', async data => {
      this.debug('client', data);

      // check for SSL message
      if( data.readInt32BE(4) === this.SSL_REQUEST ) {
        this.debug('client', 'handling ssl request');
        let resp = Buffer.from('N', 'utf8');
        this.clientSocket.write(resp);
        return;
      }
   
      // first message provides the connection properties
      if( this.firstMessage ) {
        this.debug('client', 'handling first message');
        this.parseStartupMessage(data);
        await this.initServerSocket();
        this.emitStat('socket-connect', this.startupProperties);
        this.debug('client', this.startupProperties);
      }

      // intercept the password message and handle it
      if( data[0] === this.MESSAGE_CODES.PASSWORD ) {
        this.debug('client', 'handling jwt auth');
        this.handleJwt(data);
        return;
      }

      // check for query message, if so, emit stats
      if( data[0] === this.MESSAGE_CODES.QUERY ) {
        this.emitStat('query', 1);
      }

      // else, just proxy message
      this.serverSocket.write(data);
    });

    // Handle client socket closure
    this.clientSocket.on('end', () => {
      console.log('Client socket closed');
      this.emitStat('socket-closed', 1);
      this.serverSocket.end();
      this.serverSocket = null;
    });

    // Handle errors
    this.clientSocket.on('error', err => {
      console.error('Client socket error:', err);
      this.emitStat('socket-error', 1);
      this.serverSocket.end();
      this.serverSocket = null;
    });
  }

  testPort(host, port) {
    return new Promise((resolve, reject) => {
      let client = new net.Socket();
      client.connect(port, host, function() {
        resolve(true);
        client.destroy();
      });
      client.on('error', function(e) {
        resolve(false);
        client.destroy(); 
      });
    });
  }

  async initServerSocket() {
    if( !this.startupProperties ) return;
    if( !this.startupProperties.database ) return;

    this.dbName = this.startupProperties.database;

    let isPortAlive = await this.testPort(
      this.dbName,
      this.targetPort
    );

    if( !isPortAlive ) {
      console.log('Port test failed, starting instance', this.dbName);
      let startTime = Date.now();
      await adminModel.startInstance(this.dbName);
      await waitUntil(this.dbName, this.targetPort);

      this.emitStat('instance-start', {
        database : this.dbName, 
        port : this.targetPort,
        time : Date.now() - startTime
      });
    }

    this.serverSocket = net.createConnection({ 
      host: this.dbName, 
      port: this.targetPort 
    });

    // When the target server sends data, forward it to the client
    this.serverSocket.on('data', data => {
      this.debug('server', data);

      // always a direct proxy
      this.clientSocket.write(data);
    });

    this.serverSocket.on('error', err => {
      this.emitStat('socket-error', 1);
      console.error('Target socket error:', err);
      this.clientSocket.end();
      this.clientSocket = null;
    });

    // Handle target socket closure
    this.serverSocket.on('end', () => {
      this.emitStat('socket-closed', 1);
      console.log('Target socket closed');
      this.clientSocket.end();
      this.clientSocket = null;
    });

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

    while( offset < params.length ) {
      while( values[0] !== 0  ) {
        message = Buffer.concat([message, values]);
        values = params.subarray(offset, offset + 1);
        offset += 1;
      }

      if( last === '' ) {
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
    if( Object.keys(startupProperties).length === 0 ) {
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

    let jwt = data.subarray(5, data.length-1).toString('utf8');

    let resp;
    try {
      // attempt jwt verification
      resp = await keycloak.verifyActiveToken(jwt);
    } catch(e) {
      // badness accessing keycloak
      console.error(e);
      this.sendError(
        'ERROR',
        '08006',
        e.message,
        'JWT Verification Error',
        '',
        this.clientSocket
      );
      return;
    }

    // user is not logged (token expired or invalid)
    if( resp.active !== true ) {
      this.debug('invalid jwt token', {
        tokenResponse : resp,
        jwt
      })
      this.sendError(
        'ERROR',
        '28P01',
        'Invalid JWT Token',
        'The JWT token provided is not valid or has expired.',
        'Try logging in again and using the new token.',
        this.clientSocket
      );
      return;
    }

    let jwtUsername = resp.user.username || resp.user.preferred_username;

    // provide pg username does not match jwt username
    if( jwtUsername !== this.startupProperties.user ) {
      this.sendError(
        'ERROR',
        '28P01',
        'Invalid JWT Token',
        `The JWT token username provided does not match the postgres username provided (${jwtUsername} ${this.startupProperties.user}).`,
        'Make sure your username matches your JWT token (CAS Username).',
        this.clientSocket
      );
      return;
    }

    let password = config.proxy.password.static;
    if( config.proxy.password.type === 'pg' ) {
      let resp = await pgPassConnection.query(
        `SELECT 
          password 
        FROM ${config.proxy.password.pg.table} 
        WHERE 
          username = $1 AND
          database = $2`,
        [resp.user.username, this.startupProperties.database]
      );
      password = resp.rows[0].password;
    }

    this.sendPassword(password, this.serverSocket);
  }

  sendPassword(password, socket) {
    let pLen = Buffer.byteLength(password);

    // code + len(32bit) + pass + null
    let passBuffer = Buffer.alloc(1 + 4 + pLen + 1);
    passBuffer[0] = this.MESSAGE_CODES.PASSWORD;
    passBuffer.writeInt32BE(4 + pLen + 1, 1);
    passBuffer.write(password, 5);

    socket.write(passBuffer);
  }

  sendError(severity, code, message, detail='', hint='', socket) {
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

    eBuffer[offset] = this.ERROR_CODES.SEVERITY;
    offset++;
    eBuffer.write(severity, offset);
    offset += Buffer.byteLength(severity) + 1;

    eBuffer[offset] = this.ERROR_CODES.CODE;
    offset++;
    eBuffer.write(code, offset);
    offset += Buffer.byteLength(code) + 1;

    eBuffer[offset] = this.ERROR_CODES.MESSAGE;
    offset++;
    eBuffer.write(message, offset);
    offset += Buffer.byteLength(message) + 1;

    eBuffer[offset] = this.ERROR_CODES.DETAIL;
    offset++;
    eBuffer.write(detail, offset);
    offset += Buffer.byteLength(detail) + 1;

    eBuffer[offset] = this.ERROR_CODES.HINT;
    offset++;
    eBuffer.write(hint, offset);
    offset += Buffer.byteLength(hint) + 1;

    socket.write(eBuffer);
  }

  debug(socket, data) {
    if( !this.debugEnabled ) return;

    if( data instanceof Buffer ) {
      console.log({
        socket, 
        data : '0x'+data.toString('hex'),
        string : data.toString('utf8')
      });
    } else {
      console.log({
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