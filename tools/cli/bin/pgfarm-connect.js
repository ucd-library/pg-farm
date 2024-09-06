import {Command, program} from 'commander';
import {config} from '../lib/config.js';
import yaml from 'js-yaml';


const ALLOWED_TYPES = ['psql', 'psql-full', 'json', 'yaml', 'nodejs', 'python', 'r'];

program
  .description('Show various connection examples')
  .argument('<org/database>', 'Organization and database name to connect to')
  .argument('<type>', `Connection type (${ALLOWED_TYPES.join(', ')})`)
  .action(run);

function run(orgDatabase, type) {
  if( !config.token ) {
    console.error('Please login to see connection examples');
    process.exit();
  }

  if( !ALLOWED_TYPES.includes(type) ) {
    console.error('Invalid type: '+type+'. Must be one of: '+ALLOWED_TYPES.join(', '));
    process.exit();
  }

  let username = JSON.parse(atob(config.token.split('.')[1]));
  username = username.username || username.preferred_username;

  let host = new URL(config.host).hostname;
  let port = 5432;

  let obj = {
    user: username,
    host: host,
    port: port,
    database: orgDatabase,
    password: config.tokenHash,
    ssl: true
  };

  if( type === 'psql-full' ) {
    console.log(`PGPASSWORD=$(pgfarm auth token) psql -U ${username} -h ${host} -p ${port} ${orgDatabase}`);
  } else if( type === 'psql' ) {
    console.log(`PGSERVICE=pgfarm psql ${orgDatabase}`);
  } else if( type === 'json' ) {
    console.log(JSON.stringify(obj, null, 2));
  } else if( type === 'yaml' ) {
    console.log(yaml.dump(obj));
  } else if( type === 'nodejs' ) {
    console.log(`/* https://node-postgres.com/features/connecting */
const {Pool} = require('pg');
const client = new Pool({
  user: '${obj.user}',
  host: '${obj.host}',
  port: ${obj.port},
  database: '${obj.database}',
  password: process.env.PGPASSWORD,
  ssl: ${obj.ssl}
});

await client.query('SELECT NOW()', (err, res) => {
  console.log(err, res);
  client.end();
});
`);
  } else if( type === 'python' ) {
    console.log(`# https://www.psycopg.org/docs/usage.html
import psycopg2
conn = psycopg2.connect(
  user='${obj.user}',
  host='${obj.host}',
  port=${obj.port},
  database='${obj.database}',
  password=os.environ['PGPASSWORD'],
  sslmode='require'
)

cur = conn.cursor()
cur.execute('SELECT NOW()') 
print(cur.fetchone())
cur.close()
`);
    } else if( type === 'r' ) {
    console.log(`# https://solutions.posit.co/connections/db/databases/postgresql/#using-the-rpostgres-package
library(DBI)
con <- dbConnect(
  RPostgres::Postgres(),
  user='${obj.user}',
  host='${obj.host}',
  port=${obj.port},
  dbname='${obj.database}',
  password=Sys.getenv('PGPASSWORD')
)

dbGetQuery(con, 'SELECT NOW()')
dbDisconnect(con)
`);
  }
}

program.parse(process.argv);