import net from 'net';
import config from '../../lib/config.js';
import ProxyConnection from './proxy-connection.js';
import proxyStatus from './status.js';
import logger from '../../lib/logger.js';

// Create a server that acts as a TCP proxy
config.proxy.definitions.forEach(def => {
  const proxyServer = net.createServer(clientSocket => 
    proxyStatus.register(new ProxyConnection(clientSocket))
  );

  // Start the proxy server
  proxyServer.listen(def.port, () => {
    logger.info(`PG Farm PostgreSQL TCP proxy server is running on port ${def.port}`);
  });
});
