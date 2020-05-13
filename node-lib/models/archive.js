const pg = require('../lib/pg');
const path = require('path');
const fs = require('fs-extra');

class ArchiveModel {

  // create public archive
  archive(folder) {
    if( !folder ) folder = process.cwd();
    if( fs.existsSync(folder) ) fs.remove(folder);
    await fs.mkdirp(folder);

    let databases = await pg.listDatabases();
    
    await pg.client.end();
    let orgConnParams = Object.assign({}, pg.connectionParams);

    for( let database of databases ) {
      this._archiveDatabase(folder, database);
    }

    await pg.connect(orgConnParams);
  }

  async _archiveDatabase(folder, database) {
    pg.connectionParams.database = database;
    await pg.connect(pg.connectionParams);

    let tables = await pg.listTables();
    for( let table of tables ) {
      try {
        await pg.dumpTable(folder, table.table_schema+'.'+table.table_name);
      } catch(e) {
        console.error(`Failed to dump table ${database} ${table.table_schema}.${table.table_name}`, e);
      }
    }

    let views = await pg.listViews();
    for( let view of views ) {
      let sql = await pg.getViewDefinition(view.view_schema+'.'+view.view_name);
      file = path.join(folder, database+'-'+view.view_schema+'-'+view.view_name+'.sql');
      fs.writeFileSync(file, sql[0]);
    }

    let functions = await pg.listFunctions();
    for( let fn of functions ) {
      let sql = await pg.getFunctionDefinition(fn.routine_schema+'.'+fn.routine_name);
      file = path.join(folder, database+'-'+fn.routine_schema+'-'+fn.routine_name+'.sql');
      fs.writeFileSync(file, sql[0]);
    }

    await pg.client.end();
  }

  // backup data
  // pg_dump -F p -t test -U bob -f test_data.sql --enable-row-security --data-only  -v postgres

  // backup schema
  // pg_dump -F p -t test -U bob -f test.sql --schema-only --no-privileges --no-owner -v postgres

}