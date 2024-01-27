import net from 'net';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';

const proxyServer = net.createServer(clientSocket => {
  let ip = clientSocket.remoteAddress;
  logger.info('Gateway connection opened', ip);

  clientSocket.on('error', err => {
    logger.error('PG proxy client socket error', ip, err);
    close(clientSocket, serverSocket);
  });

  clientSocket.on('end', () => {
    logger.info('PG proxy client connection closed', ip);
    close(clientSocket, serverSocket);
  });

  const serverSocket = net.createConnection({ 
    host: config.gateway.pg.host, 
    port: config.gateway.pg.port
  });

  serverSocket.on('connect', () => {
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });

  serverSocket.on('error', err => {
    logger.error('PG proxy server socket error', ip, err);
    close(clientSocket, serverSocket);
  });

  serverSocket.on('end', () => {
    logger.info('PG proxy server socket connection closed', ip);
    close(clientSocket, serverSocket);
  });


});

function close(client, server) {
  client.end();
  server.end();
}

// Start the proxy server
proxyServer.listen(config.gateway.pg.port, () => {
  logger.info(`PG Farm Gateway PostgreSQL TCP proxy server is running on port ${config.gateway.pg.port}`);
});
