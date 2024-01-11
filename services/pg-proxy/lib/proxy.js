import net from 'net';
import config from '../../lib/config.js';
import ProxyConnection from './proxy-connection.js';

// Create a server that acts as a TCP proxy
const proxyServer = net.createServer(clientSocket => 
  new ProxyConnection(
    clientSocket, 
    net.createConnection({ 
      host: config.proxy.targetHost, 
      port: config.proxy.targetPort 
    })
  )
);

// Start the proxy server
proxyServer.listen(config.proxy.port, () => {
  console.log(`TCP proxy server is running on port ${config.proxy.port}`);
});