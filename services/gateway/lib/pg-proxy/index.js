import config from '../../../lib/config.js';
import ProxyConnection from './proxy-connection.js';
import PgFarmTcpServer from '../tcp-server/index.js';


// TODO: remove support multiple definitions
let definition = config.proxy.definitions[0];

let server = new PgFarmTcpServer({
    name: 'pg-proxy',
    logging: true,
    port: definition.port
  }, 
  (clientSocket, sessionId) => {
    let con = new ProxyConnection(clientSocket, server, sessionId);
    return con;
  }
);

server.start();