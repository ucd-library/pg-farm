import config from '../../../lib/config.js';
import ProxyConnection from './proxy-connection.js';
import proxyStatus from './status.js';
import PgFarmTcpServer from '../tcp-server/index.js';


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