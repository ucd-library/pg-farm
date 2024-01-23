import net from 'net';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';

const proxyServer = net.createServer(clientSocket => {

  const serverSocket = net.createConnection({ 
    host: config.gateway.pg.host, 
    port: config.gateway.pg.port
  });

  serverSocket.on('connect', () => {
    serverSocket.pipe(clientSocket);
    clientSocket.pipe(serverSocket);
  });
});

// Start the proxy server
proxyServer.listen(config.gateway.pg.port, () => {
  logger.info(`PG Farm Gateway PostgreSQL TCP proxy server is running on port ${config.gateway.pg.port}`);
});
