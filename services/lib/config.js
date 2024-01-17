const env = process.env;

const PORT = parseInt(env.PORT || env.SERVICE_PORT || 3000);
let SERVICE_URL = env.SERVICE_URL || 'http://localhost:'+PORT;
if( PORT !== 80 && !SERVICE_URL.match(new RegExp(':'+PORT+'$'))  ) {
  SERVICE_URL = SERVICE_URL+':'+PORT;
}

let PROXIES = [];
if( env.PROXY_DEFINITIONS ) {
  PROXIES = PROXY_DEFINITIONS.split(/,|\s/).map((def) => {
    let [port, targetHost, targetPort] = def.split(':');
    return {port, targetHost, targetPort}
  });
} else {
  PROXIES = [{port: 5432, targetHost : 'postgres', targetPort : 5432}];
}

const config = {

  service : {
    url : SERVICE_URL,
    port : PORT
  },

  jwt : {
    secret : env.JWT_SECRET || 'secretsecret'
  },

  // Keycloak configuration
  oidc : {
    tokenCacheTTL : env.OIDC_TOKEN_CACHE_TTL || 1000*30,
    baseUrl : env.OIDC_BASE_URL || 'https://sandbox.auth.library.ucdavis.edu/realms/pg-farm',
    clientId : env.OIDC_CLIENT_ID || '',
    secret : env.OIDC_SECRET || '',
    scopes : env.OIDC_SCOPES || 'openid profile email',
    roleIgnoreList : []
  },

  // Proxy configuration
  proxy: {
    definitions : PROXIES,

    // port: env.PROXY_PORT || 5432, // Port to listen on
    // targetHost: env.PROXY_TARGET_HOST || 'postgres', // Host to listen on
    targetPort: env.PROXY_TARGET_PORT || 5432, // Port to listen on
    password : {
      type : env.PROXY_PASSWORD_TYPE || 'static', // 'static' or 'pg'
      static : env.PROXY_PASSWORD_STATIC || 'postgres', // Static password to use
      pg : {
        host : env.PROXY_PASSWORD_PG_HOST || 'postgres', // Host to connect to
        port : env.PROXY_PASSWORD_PG_PORT || 5432, // Port to connect to
        user : env.PROXY_PASSWORD_PG_USER || 'postgres', // User to connect as
        password : env.PROXY_PASSWORD_PG_PASSWORD || 'postgres', // Password to use
        database : env.PROXY_PASSWORD_PG_DATABASE || 'postgres', // Database to connect to
        table : env.PROXY_PASSWORD_PG_TABLE || 'users_auth', // Table to query
      }
    },
    debug : env.PROXY_DEBUG || false // Enable debug logging
  }

}

export default config;