import net from 'net';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';
import utils from '../../lib/utils.js';
import PgFarmTcpServer from '../../lib/tcp-server/index.js';

let server = new PgFarmTcpServer({
    name: 'gateway',
    logging: true,
    port: config.gateway.pg.port
  }, 
  (clientSocket) => {
    let connected = false;
    let buffer = [];

    let serverSocket = server.createProxyConnection(
      config.gateway.pg.host,
      config.gateway.pg.port,
      clientSocket
    );

    clientSocket.on('data', data => {
      if( !connected ) {
        return buffer.push(data);
      }
      serverSocket.write(data);
    });

    serverSocket.on('connect', () => {
      connected = true;
      buffer.forEach(data => serverSocket.write(data));
      buffer = null;
    });

    serverSocket.on('data', data => {
      clientSocket.write(data);
    });
  }
);

server.start();

// const proxyServer = net.createServer(clientSocket => {

//   let ip = clientSocket.remoteAddress;
//   logger.info('Gateway connection opened', ip);

//   // TODO: this doesn't work when connecting to node client
//   // let dataTimeout = setTimeout(() => {
//   //   logger.info('Gateway connection data timed out', ip);
//   //   close(clientSocket, serverSocket);
//   // }, 5000);

//   // clientSocket.once('data', () => {
//   //   clearTimeout(dataTimeout);  
//   //   console.log('ere');
//   // });

//   clientSocket.on('error', err => {
//     logger.error('Gateway client socket on error event', ip, err);
//     close(clientSocket, serverSocket);
//   });

//   clientSocket.on('end', () => {
//     logger.info('Gateway client socket on end event', ip);
//     close(clientSocket, serverSocket);
//   });

//   const serverSocket = net.createConnection({ 
//     host: config.gateway.pg.host, 
//     port: config.gateway.pg.port
//   });

//   serverSocket.on('connect', () => {
//     logger.info('Gateway server socket connected', config.gateway.pg.host+':'+config.gateway.pg.port);
//     serverSocket.pipe(clientSocket);
//     clientSocket.pipe(serverSocket);
//   });

//   serverSocket.on('error', err => {
//     logger.error('Gateway server socket on error event', ip, err);
//     close(clientSocket, serverSocket);
//   });

//   serverSocket.on('end', () => {
//     logger.info('Gateway server socket on end event', ip);
//     close(clientSocket, serverSocket);
//   });

// });

// metrics.registerServer(proxyServer);


// async function close(client, server) {
//   try {
//     await utils.closeSocket(client);
//     logger.info('Closed client socket successfully');
//   } catch(e) {
//     logger.error('Failed to close client socket', e);
//   }

//   try {
//     await utils.closeSocket(server);
//     logger.info('Closed server socket successfully');
//   } catch(e) {
//     logger.error('Failed to close server socket', e);
//   }
// }

// proxyServer.on('error', err => {
//   logger.error('Proxy server on error event', err);
// });

// proxyServer.on('drop', e => {
//   logger.error('Proxy server on drop event', e);
// });

// // Start the proxy server
// proxyServer.listen(config.gateway.pg.port, () => {
//   logger.info(`PG Farm Gateway PostgreSQL TCP proxy server is running on port ${config.gateway.pg.port}`);
// });
