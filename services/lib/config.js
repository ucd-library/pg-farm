import fs from 'fs';
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

let serviceAccountExists = false;
if( env.GOOGLE_APPLICATION_CREDENTIALS ) {
  serviceAccountExists = fs.existsSync(env.GOOGLE_APPLICATION_CREDENTIALS);
}

const config = {

  logging : {
    level : env.LOG_LEVEL || 'info'
  },

  service : {
    url : SERVICE_URL,
    port : PORT
  },

  jwt : {
    secret : env.JWT_SECRET || 'secretsecret'
  },

  // Keycloak configuration
  oidc : {
    tokenCacheTTL : env.OIDC_TOKEN_CACHE_TTL || 1000*60*5,
    baseUrl : env.OIDC_BASE_URL || 'https://sandbox.auth.library.ucdavis.edu/realms/pg-farm',
    clientId : env.OIDC_CLIENT_ID || '',
    secret : env.OIDC_SECRET || '',
    scopes : env.OIDC_SCOPES || 'openid profile email',
    roleIgnoreList : []
  },

  gc : {
    projectId : env.GC_PROJECT_ID || 'digital-ucdavis-edu',
    gke : {
      zone : env.GKE_ZONE || 'us-central1-c',
    },
    keyFilename : env.GOOGLE_APPLICATION_CREDENTIALS || '/etc/google/service-account.json',
    bucket : env.GC_BUCKET || 'pg-farm',
    serviceAccountExists
  },

  k8s : {
    platform : 'gke',
    cluster : env.K8S_CLUSTER || 'pg-farm',
    region : env.K8S_REGION || 'us-central1-c',
  },
  
  adminDb : {
    username : env.PG_USERNAME || 'postgres',
    password : env.PG_PASSWORD || 'postgres',
    database : env.PG_DATABASE || 'pgfarm',
    schema : env.PG_SCHEMA || 'pgfarm', 
    port : env.PG_PORT || 5432,
    host : env.PG_HOST || 'admin-db',

    tables : {
      INSTANCE : () => this.pg.schema+'.instance',
      DATABASE_USERS : () => this.pg.schema+'.database_user'
    },
    views : {
      INSTANCE_USERS : () => this.pg.schema+'.instance_database_user'
    }
  },

  // Proxy configuration
  proxy: {
    definitions : PROXIES,
    autoStartInstances : (env.AUTO_START_INSTANCES === 'true'),
    tls : {
      enabled : env.PROXY_TLS_ENABLED ? env.PROXY_TLS_ENABLED === 'true' ? true : false, // Enable TLS
      key : env.PROXY_TLS_KEY || '/etc/pg-farm/proxy-tls-key.pem', // Path to TLS key
      cert : env.PROXY_TLS_CERT || '/etc/pg-farm/proxy-tls-cert.pem', // Path to TLS cert
    },

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