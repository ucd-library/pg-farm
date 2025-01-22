import yaml from 'js-yaml';

export default class ConnectExamples {

  constructor (opts={}){
    this.setOpts(opts);

    this.registry = [
      {
        name: 'psql',
        template: () => `PGSERVICE=pgfarm psql ${this.opts.database}`
      },
      {
        name: 'psql-full',
        template: () => `PGPASSWORD=$(pgfarm auth token) psql -U ${this.opts.user} -h ${this.opts.host} -p ${this.opts.port} ${this.opts.database}`
      },
      {
        name: 'json',
        template: () => JSON.stringify(this.opts, null, 2)
      },
      {
        name: 'yaml',
        template: () => yaml.dump(this.opts)
      },
      {
        name: 'nodejs',
        template: () =>`
/* https://node-postgres.com/features/connecting */
const {Pool} = require('pg');
const client = new Pool({
  user: '${this.opts.user}',
  host: '${this.opts.host}',
  port: ${this.opts.port},
  database: '${this.opts.database}',
  password: process.env.PGPASSWORD,
  ssl: ${this.opts.ssl}
});

await client.query('SELECT NOW()', (err, res) => {
  console.log(err, res);
  client.end();
});`
      },
      {
        name: 'python',
        template: () => `
# https://www.psycopg.org/docs/usage.html
import psycopg2
conn = psycopg2.connect(
  user='${this.opts.user}',
  host='${this.opts.host}',
  port=${this.opts.port},
  database='${this.opts.database}',
  password=os.environ['PGPASSWORD'],
  sslmode='require'
)

cur = conn.cursor()
cur.execute('SELECT NOW()')
print(cur.fetchone())
cur.close()`
      },
      {
        name: 'r',
        template: () => `
# https://solutions.posit.co/connections/db/databases/postgresql/#using-the-rpostgres-package
library(DBI)
con <- dbConnect(
  RPostgres::Postgres(),
  user='${this.opts.user}',
  host='${this.opts.host}',
  port=${this.opts.port},
  dbname='${this.opts.database}',
  password=Sys.getenv('PGPASSWORD')
)

dbGetQuery(con, 'SELECT NOW()')
dbDisconnect(con)`
      },
      {
        name: 'http',
        template: () => `
# docs: https://docs.postgrest.org/en/stable/references/api/tables_views.html
curl ${this.opts.queryPath}/${this.opts.database}
        `
      }
    ];
  }

  getConnectionTypes() {
    return this.registry.map( item => item.name );
  }

  getTemplate(connectionType) {
    let item = this.registry.find( item => item.name === connectionType );
    if ( !item ) {
      throw new Error(`Unknown connection type: ${connectionType}`);
    }
    if ( typeof item.template === 'function' ) {
      return item.template();
    }
    return item.template;
  }

  logTemplate(connectionType) {
    console.log(this.getTemplate(connectionType));
  }

  setOpts(opts={}) {
    this.opts = {
      user: '<USERNAME>',
      host: 'pgfarm.library.ucdavis.edu',
      port: 5432,
      database: '<ORGANIZATION/DATABASE>',
      password: '<PASSWORD>',
      ssl: true,
      queryPath: 'https://pgfarm.library.ucdavis.edu/api/query',
      ...opts
    };
  }
}




