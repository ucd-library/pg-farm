import net from 'net';
import config from '../../lib/config.js';
import ProxyConnection from './proxy-connection.js';

// Create a server that acts as a TCP proxy
config.proxy.definitions.forEach(def => {
  const proxyServer = net.createServer(clientSocket => 
    new ProxyConnection(clientSocket)
  );

  // Start the proxy server
  proxyServer.listen(def.port, () => {
    console.log(`TCP proxy server is running on port ${def.port}`);
  });
});
