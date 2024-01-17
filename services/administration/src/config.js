const env = process.env;

const config = {

  gc : {
    projectId : env.GC_PROJECT_ID || 'digital-ucdavis-edu',
    gke : {
      zone : env.GKE_REGION || 'us-central1-c',
    },
    keyFilename : env.GC_KEY_FILENAME || './pg-farm.json',
    bucket : env.GC_BUCKET || 'pg-farm'
  },

  k8s : {
    platform : 'gke',
    cluster : env.K8S_CLUSTER || 'pg-farm',
    region : env.K8S_REGION || 'us-central1-c',
  },
  
  pg : {
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
  }

}

export default config;