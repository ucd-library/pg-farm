import net from 'net';
import config from '../../lib/config.js';
import ProxyConnection from './proxy-connection.js';
import proxyStatus from './status.js';
import logger from '../../lib/logger.js';
import PgFarmTcpServer from '../../lib/tcp-server/index.js';


// TODO: remove support multiple definitions
let definition = config.proxy.definitions[0];

let server = new PgFarmTcpServer({
    name: 'pg-proxy',
    logging: true,
    port: definition.port
  }, 
  (clientSocket) => {
    proxyStatus.registerConnection(
      new ProxyConnection(clientSocket, server)
    );
  }
);

server.start();

// // Create a server that acts as a TCP proxy
// config.proxy.definitions.forEach(def => {
//   const proxyServer = net.createServer(clientSocket => 
//     proxyStatus.registerConnection(new ProxyConnection(clientSocket))
//   );

//   proxyStatus.registerServer(proxyServer);

//   proxyServer.on('error', err => {
//     logger.error('Proxy server on error event', err);
//   });

//   proxyServer.on('drop', e => {
//     logger.error('Proxy server on drop event', e);
//   });

//   // Start the proxy server
//   proxyServer.listen(def.port, () => {
//     logger.info(`PG Farm PostgreSQL TCP proxy server is running on port ${def.port}`);
//   });
// });
