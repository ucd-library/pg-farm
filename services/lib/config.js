import fs from 'fs';
const env = process.env;

// construct the image tag from the build info or env
let BUILD_INFO = {};
let PG_INSTANCE_IMAGE = 'us-west1-docker.pkg.dev/digital-ucdavis-edu/pub/postgres:16'
let BASE_IMAGE;
if( fs.existsSync('/cork-build-info/pgfarm-service.json') ) {
  BUILD_INFO = JSON.parse(fs.readFileSync('/cork-build-info/pgfarm-service.json'));
  BASE_IMAGE = BUILD_INFO.imageTag;
}
if( env.PG_INSTANCE_IMAGE ) PG_INSTANCE_IMAGE = env.PG_INSTANCE_IMAGE;
if( env.BASE_IMAGE ) BASE_IMAGE = env.BASE_IMAGE;

if( !PG_INSTANCE_IMAGE || !BASE_IMAGE ) {
  throw new Error('Missing required image tags via env (PG_INSTANCE_IMAGE and BASE_IMAGE) or build info');
}

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

// k8s env collision
let healthProbePort = env.HEALTH_PROBE_PORT || '3000';
if( healthProbePort.match(/^tcp:/) ) {
  healthProbePort = healthProbePort.split(':').pop();
}

let clientEnv = env.CLIENT_ENV || 'dev';

let clientPort = env.CLIENT_PORT || '3000';
if( clientPort.match(/^tcp:/) ) {
  clientPort = new URL(clientPort).port;
}

const config = {

  appUrl : env.APP_URL || 'http://localhost:3000',

  logging : {
    level : env.LOG_LEVEL || 'info'
  },

  metrics : {
    enabled : env.METRICS_ENABLED === 'true',
  },

  service : {
    url : SERVICE_URL,
    port : PORT
  },

  jwt : {
    secret : env.JWT_SECRET || 'secretsecret',
    cookieName : env.JWT_COOKIE_NAME || 'pgfarm-token',
    header : env.JWT_HEADER || 'x-pgfarm-token'
  },

  client : {
    env : clientEnv,
    port : parseInt(clientPort),
    assets : (clientEnv === 'prod') ? 'dist' : 'dev',
    title : 'PG Farm',
    appRoutes : ['search', 'db', 'features', 'contact', 'org'],
    staticAssetsBaseUrl : env.CLIENT_STATIC_ASSETS_BASE_URL || 'https://storage.googleapis.com/application-static-assets',
    logger : {
      logLevel : env.CLIENT_LOG_LEVEL || 'info',
      logLevels : env.CLIENT_LOG_LEVELS ? JSON.parse(env.CLIENT_LOG_LEVELS) : {},
      reportErrors : {
        enabled : env.CLIENT_ERROR_REPORTING_ENABLED === 'true',
        url : env.CLIENT_ERROR_REPORTING_URL || '',
        key : env.CLIENT_ERROR_REPORTING_KEY || '',
        sourceMapExtension : '.map'
      }
    },
    recaptcha : {
      //disabled : env.CLIENT_RECAPTCHA_DISABLED === 'true',
      disabled: true,
      siteKey : env.CLIENT_RECAPTCHA_SITE_KEY || '',
      secretKey : env.CLIENT_RECAPTCHA_SECRET_KEY || ''
    },
    buildInfo: {
      remote: BUILD_INFO.remote,
      commit: BUILD_INFO.commit,
      tag: BUILD_INFO.tag,
      branch: BUILD_INFO.branch,
      name: BUILD_INFO.name,
      date: BUILD_INFO.date,
      imageTag: BUILD_INFO.imageTag
    }
  },

  smtp: {
    host : env.SMTP_HOST || 'smtp.lib.ucdavis.edu',
    port : env.SMTP_PORT || 25,
    secure : env.SMTP_SECURE === 'true',
    adminEmail : env.SMTP_ADMIN_EMAIL || '',
    fromEmail : env.SMTP_FROM_EMAIL || 'no-reply@pgfarm.library.ucdavis.edu'
  },

  gateway : {
    pg : {
      host : env.GATEWAY_PG_PROXY_HOST || 'pg-proxy',
      port : env.GATEWAY_PG_PROXY_PORT || 5432
    },
    http : {
      targetHost : env.GATEWAY_HTTP_PROXY_TARGET_HOST || 'client',
      targetPort : env.GATEWAY_HTTP_PROXY_TARGET_PORT || 3000,
      enabled : env.GATEWAY_HTTP_ENABLED === 'true',
      port : 80
    },
    https : {
      port : 443,
      certFolder : env.GATEWAY_HTTPS_CERT_FOLDER || '/etc/pgfarm/certs'
    },
    cidrDeny : {
      enabled : env.GATEWAY_CIDR_DENY_ENABLED === 'true',
      listFile : env.GATEWAY_CIDR_DENY_LIST_FILE || '/etc/pgfarm/cidr-deny-list.txt',
    }
  },

  backup : {
    cron : env.BACKUP_CRON || '0 0 * * *',
    bucket : env.BACKUP_BUCKET || 'app-database-backups',
    autoBackupEnabled : env.AUTO_BACKUP_ENABLED === 'true', // mostly used by admin database
    autoBackupName : env.AUTO_BACKUP_NAME || 'pgfarm-admin-db',
  },

  // Keycloak configuration
  oidc : {
    tokenCacheTTL : env.OIDC_TOKEN_CACHE_TTL || 1000*60*5,
    baseUrl : env.OIDC_BASE_URL || 'https://sandbox.auth.library.ucdavis.edu/realms/pg-farm',
    clientId : env.OIDC_CLIENT_ID || '',
    secret : env.OIDC_SECRET || '',
    scopes : env.OIDC_SCOPES || 'roles openid profile email',
    roleIgnoreList : [],
    loginPath : env.PGFARM_LOGIN_PATH || '/login',
    logoutPath : env.PGFARM_LOGOUT_PATH || '/auth/logout'
  },

  gc : {
    projectId : env.GC_PROJECT_ID || 'pgfarm-419213',
    gke : {
      zone : env.GKE_ZONE || 'us-central1-c',
    },
    keyFilename : env.GOOGLE_APPLICATION_CREDENTIALS || '/etc/google/service-account.json',
    serviceAccountExists
  },

  k8s : {
    enabled : env.K8S_DISABLED === 'true' ? false : true,
    platform : env.K8S_PLATFORM || 'gke',
    cluster : env.K8S_CLUSTER || 'pgfarm',
    region : env.K8S_REGION || 'us-central1-c',
  },

  admin : {
    host : env.ADMIN_HOST || 'admin',
    port : env.ADMIN_PORT || 3000
  },

  adminDb : {
    username : env.PG_USERNAME || 'postgres',
    password : env.PG_PASSWORD || 'postgres',
    database : env.PG_DATABASE || 'postgres',
    schema : env.PG_SCHEMA || 'pgfarm',
    port : env.PG_PORT || 5432,
    host : env.PG_HOST || 'admin-db',

    tables : {
      get ORGANIZATION() { return config.adminDb.schema+'.organization' },
      get INSTANCE() { return config.adminDb.schema+'.instance' },
      get DATABASE() { return config.adminDb.schema+'.database' },
      get DATABASE_FEATURED() { return config.adminDb.schema+'.database_featured' },
      get USER_TOKEN() { return config.adminDb.schema+'.user_token' },
      get INSTANCE_USER() { return config.adminDb.schema+'.instance_user' },
      get INSTANCE_CONFIG() { return config.adminDb.schema+'.k8s_config_property' }
    },
    views : {
      get INSTANCE() { return config.adminDb.schema+'.instance_view' },
      get INSTANCE_DATABASE() { return config.adminDb.schema+'.instance_database' },
      get INSTANCE_DATABASE_FEATURED() { return config.adminDb.schema+'.instance_database_featured' },
      get INSTANCE_DATABASE_USERS() { return config.adminDb.schema+'.instance_database_user' },
      get DATABASE_EVENT() { return config.adminDb.schema+'.database_last_event_view' },
      get ORGANIZATION_USER() { return config.adminDb.schema+'.organization_user' },
    }
  },

  pgInstance : {
    name : env.PG_INSTANCE_NAME || '', // set for running pg instances
    organization : env.PG_INSTANCE_ORGANIZATION || null, // set for running pg instances
    port : 5432,
    image : PG_INSTANCE_IMAGE,
    adminRole : 'postgres',
    adminInitPassword : env.PG_INSTANCE_ADMIN_INIT_PASSWORD || 'postgres',
    publicRole : {
      username : env.PG_INSTANCE_PUBLIC_ROLE || 'pgfarm-public',
      password : env.PG_INSTANCE_PUBLIC_PASSWORD || 'go-aggies',
    },
    // this should be a couple hours after the backup cron
    shutdownCron : env.PG_INSTANCE_SHUTDOWN_CRON || '0 4 * * *',
  },

  pgRest : {
    image : BASE_IMAGE,
    authenticator : {
      username : env.PG_REST_AUTHENTICATOR_USERNAME || 'pgfarm-authenticator'
    },
    schema : env.PG_REST_SCHEMA || 'api',
    port : env.PG_REST_PORT || 3000,
  },

  pgHelper : {
    image : BASE_IMAGE,
    port : env.PG_HELPER_PORT || 3000
  },

  // Proxy configuration
  proxy: {
    definitions : PROXIES,
    autoStartInstances : (env.AUTO_START_INSTANCES === 'true'),
    tls : {
      enabled : env.PROXY_TLS_ENABLED === 'true', // Enable TLS
      key : env.PROXY_TLS_KEY || '/etc/pg-farm/proxy-tls-key.pem', // Path to TLS key
      cert : env.PROXY_TLS_CERT || '/etc/pg-farm/proxy-tls-cert.pem', // Path to TLS cert
    },

    // port: env.PROXY_PORT || 5432, // Port to listen on
    // targetHost: env.PROXY_TARGET_HOST || 'postgres', // Host to listen on
    targetPort: env.PROXY_TARGET_PORT || 5432, // Port to listen on
    password : {
      type : env.PROXY_PASSWORD_TYPE || 'pg', // 'static' or 'pg'
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
    debug : env.PROXY_DEBUG === 'true' // Enable debug logging
  },

  healthProbe : {
    port : parseInt(healthProbePort),
    host : env.HEALTH_PROBE_HOSTNAME || 'health-probe',
    interval : env.HEALTH_PROBE_INTERVAL || 1000*10,
  },

}

export default config;
