
const {Client} = require('pg');
const {exec} = require('child_process');
const path = require('path');

class PG {

  constructor() {
    process.on('exit', async () => {
      if( !this.client ) return;
      try {
        await this.client.end();
      } catch(e) {}
      console.log('ending pg client connection');
    });
    process.on('SIGINT', async () => {
      if( !this.client ) return;
      try {
        await this.client.end();
      } catch(e) {}
      console.log('SIGINT: ending pg client connection');
    });
  }


  connect(params) {
    this.connectionParams = params;
    this.client = new Client(params);
    this.client.connect();
  }

  async query(stmt, params, allinfo=false) {
    let resp = await this.client.query(stmt, params);
    if( allinfo ) return resp;
    return resp.rows || [];
  }

  listDatabases() {
    return this.query('SELECT datname FROM pg_database WHERE datistemplate = false;');
  }

  listSchemas() {
    return this.query('SELECT nspname FROM pg_catalog.pg_namespace');
  }

  listTables() {
    return this.query(`SELECT table_schema, table_name
      FROM information_schema.tables
      WHERE table_schema not in ('information_schema', 'pg_catalog')
      ORDER BY table_schema, table_name`
    );
  }

  listViews() {
    return this.query(`SELECT table_schema AS view_schema,
      table_name AS view_name
      FROM information_schema.views
      WHERE table_schema not in ('information_schema', 'pg_catalog')
      ORDER BY view_schema, view_name`
    );
  }

  listFunctions() {
    return this.query(`SELECT routine_schema, routine_name
      FROM information_schema.routines
      WHERE routine_schema not in ('information_schema', 'pg_catalog')
      ORDER BY routine_schema, routine_name`
    );
  }

  getViewDefinition(view) {
    return this.query(`select * from pg_catalog.pg_views where viewname = '${view}'`);
  }

  getFunctionDefinition(fn) {
    return this.query(`SELECT pg_get_functiondef('${fn}'::regproc)`);
  }

  // https://www.postgresql.org/docs/12/app-pgdump.html
  async dumpTable(folder, table) {
    let {database, username, password} = this.connectionParams;

    let file = path.join(folder, database+'-'+table.replace(/\./g,'-')+'-schema.sql');
    await _exec(`pg_dump --format p --table ${table} --username ${username} --password ${password} --file ${file} --schema-only --no-privileges --no-owner ${database}`);

    file = path.join(folder, database+'-'+table.replace(/\./g,'-')+'-data.sql');
    await _exec(`pg_dump --format p --table ${table} --username ${username} --password ${password} --file ${file} --enable-row-security --data-only ${database}`);
  }

}

function _exec(cmd, opts={}) {
  if( !opts.shell ) opts.schell = '/bin/bash';
  if( !opts.cwd ) opts.cwd = process.cwd();
  return new Promise((resolve, reject) => {
    exec(cmd, opts, (error, stdout, stderr) => {
      if( error ) reject(error);
      else resolve({stdout, stderr});
    });
  });
}

module.exports = new PG();