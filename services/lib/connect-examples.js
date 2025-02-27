import yaml from 'js-yaml';

export default class ConnectExamples {

  constructor (opts={}){
    this.setOpts(opts);

    this.registry = [
      {
        name: 'psql',
        prismLang: 'bash',
        loggedInOnly: true,
        template: () => {
          return `PGSERVICE=pgfarm psql ${this.opts.database}`;
        }
      },
      {
        name: 'psql-full',
        prismLang: 'bash',
        template: () => {
          let password = 'PGPASSWORD=$(pgfarm auth token)';
          if( this.opts.password ) {
            password = `PGPASSWORD="${this.opts.password}"`;
          }

          return `${password} PGSSLMODE='verify-full' PGSSLROOTCERT='system' psql -U ${this.opts.user} -h ${this.opts.host} -p ${this.opts.port} ${this.opts.database}`;
        }
      },
      {
        name: 'json',
        prismLang: 'json',
        template: () => {
          if( !this.opts.password ) {
            this.opts.password = '<PASSWORD>';
          }
          return JSON.stringify(this.opts, null, 2)
        }
      },
      {
        name: 'yaml',
        prismLang: 'yaml',
        template: () => {
          if( !this.opts.password ) {
            this.opts.password = '<PASSWORD>';
          }
          yaml.dump(this.opts)
        }
      },
      {
        name: 'nodejs',
        prismLang: 'javascript',
        template: () => {
          let password = 'process.env.PGPASSWORD';
          if( this.opts.password ) {
            password = `'${this.opts.password}'`;
          }

          return`
/* https://node-postgres.com/features/connecting */
const {Pool} = require('pg');


const client = new Pool({
  user: '${this.opts.user}',
  host: '${this.opts.host}',
  port: ${this.opts.port},
  database: '${this.opts.database}',
  password: ${password},
  ssl : {requestCert: true}
});

await client.query('SELECT NOW()', (err, res) => {
  console.log(err, res);
  client.end();
});`
        }
      },
      {
        name: 'python',
        prismLang: 'python',
        template: () => { 
          let password = 'os.environ["PGPASSWORD"]';
          if( this.opts.password ) {
            password = `'${this.opts.password}'`;
          }
          
          return`
# https://www.psycopg.org/docs/usage.html
import psycopg2

# Recommended, use ~/.pg_service file set by pgfarm
conn = psycopg2.connect(service='pgfarm', database='${this.opts.database}')

# Alternative, provide connection details
#conn = psycopg2.connect(
#  user='${this.opts.user}',
#  host='${this.opts.host}',
#  port=${this.opts.port},
#  database='${this.opts.database}',
#  password=${password},
#  sslmode='verify-full',
#  sslrootcert='system'
#)

cur = conn.cursor()
cur.execute('SELECT NOW()')
print(cur.fetchone())
cur.close()`
        }
      },
      {
        name: 'r',
        prismLang: 'r',
        template: () => { 
          let password = 'Sys.getenv("PGPASSWORD")';
          if( this.opts.password ) {
            password = `'${this.opts.password}'`;
          }
          return `
# https://solutions.posit.co/connections/db/databases/postgresql/#using-the-rpostgres-package
install.packages('RPostgres') # if not already installed

library(DBI)

# recommended, use ~/.pg_service file set by pgfarm
con <- dbConnect(
  RPostgres::Postgres(),
  service='pgfarm',
  dbname='${this.opts.database}'
)

# alternative
# con <- dbConnect(
#  RPostgres::Postgres(),
#  user='${this.opts.user}',
#  host='${this.opts.host}',
#  port=${this.opts.port},
#  dbname='${this.opts.database}',
#  password=${password},
#  sslmode='verify-full',
#  sslrootcert='system'
#)

dbGetQuery(con, 'SELECT NOW()')
dbDisconnect(con)`
        }
      },
      {
        name: 'http',
        prismLang: 'bash',
        template: () => { 
          let password = '';
          let header = '';
          if( this.opts.password ) {
            password="export TOKEN=$(pgfarm auth token)\n";
            header = '-H "Authorization: Bearer $TOKEN" ';
          }

          return `
# docs: https://docs.postgrest.org/en/stable/references/api/tables_views.html
${password}curl ${header}${this.opts.queryPath}/${this.opts.database}
        `
        }
      }
    ];
  }

  getConnectionTypes(isLoggedIn) {
    return this.registry
      .filter( item => !item.loggedInOnly || (item.loggedInOnly && isLoggedIn) )
      .map( item => item.name )
      
  }

  getTemplate(connectionType) {
    const item = this.getConnectionType(connectionType);
    if ( typeof item.template === 'function' ) {
      return item.template();
    }
    return item.template;
  }

  logTemplate(connectionType) {
    console.log(this.getTemplate(connectionType));
  }

  getConnectionType(connectionType) {
    const item = this.registry.find( item => item.name === connectionType );
    if ( !item ) {
      throw new Error(`Unknown connection type: ${connectionType}`);
    }
    return item;
  }

  getPrismLang(connectionType) {
    return this.getConnectionType(connectionType).prismLang;
  }

  setOpts(opts={}) {
    this.opts = {
      user: '<USERNAME>',
      host: 'pgfarm.library.ucdavis.edu',
      port: 5432,
      database: '<ORGANIZATION/DATABASE>',
      password: '',
      ssl: true,
      queryPath: 'https://pgfarm.library.ucdavis.edu/api/query',
      ...opts
    };
  }
}




