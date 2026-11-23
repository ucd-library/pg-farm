import yaml from 'js-yaml';
import colors from 'colors';

class Print {

  constructor() {
    this.schemaUserAccess = this.schemaUserAccess.bind(this);
    this.orgUsers = this.orgUsers.bind(this);
    this.instances = this.instances.bind(this);
    this.dbUsers = this.dbUsers.bind(this);
    this.publicUserSummary = this.publicUserSummary.bind(this);
    this.publicUserReport = this.publicUserReport.bind(this);
  }


  display(payload, format, textPrint) {
    if( payload instanceof Error ) {
      payload = {error: {message: payload.message, stack: payload.stack}};
    }

    if( payload.error ) {
      if( payload.error.response ) {
        payload.error.statusHttpCode = payload.error.response.status;
        delete payload.error.response;
      }
      if( payload.error.details instanceof Error ) {
        payload.error.details = {
          message: payload.error.details.message,
          stack: payload.error.details.stack
        };
      }

      if( format === 'json' ) {
        this.json(payload.error, true);
      } else {
        this.yaml(payload.error, true);
      }
      return;
    }

    if( format === 'quiet' ) {
      return;
    }

    if( payload.payload ) {
      payload = payload.payload;
    }

    if( format === 'json' ) {
      this.json(payload);
    } else if( format === 'yaml' || !textPrint ) {
      this.yaml(payload);
    } else {
      textPrint(payload);
    }
  }

  json(data, stderr=false) {
    if( stderr ) {
      console.error(JSON.stringify(data, null, 2));
      return;
    }
    console.log(JSON.stringify(data, null, 2));
  }

  yaml(data, stderr=false) {
    if( stderr ) {
      console.error(yaml.dump(data));
      return;
    }
    console.log(yaml.dump(data));
  }

  database(db) {
    let name = db.name || db?.database?.name || db?.database_name;

    if( db.organization ) {
      console.log(`Name: ${db.organization.name}/${name}`);
    } else if( db.database ) {
      console.log(`Name: _/${name}`);
    } else if( db.database_name ) {
      console.log(`Name: ${db.organization_name || '_'}/${name}`);
    } else {
      console.log(`Name: ${name}`);
    }
    console.log(`Title: ${db?.database?.title || db.database_title || ''}`);
  }

  dbSearch(result) {
    if( result.total === 0 ) {
      console.log('No databases found');
      return;
    }

    console.log(`Found ${result.total} database(s), showing ${result.query.offset+1} to ${result.query.offset+result.items.length}`);
    console.log('----');
    result.items.forEach(db => {
      console.log(`Name: ${db?.organization?.name}/${db.name}`);
      console.log(`Title: ${db.title}`);
      if( db.description ) console.log(`Description: ${db.description}`);
      if( db.url ) console.log(`URL: ${db.url}`);
      if( db.tags ) console.log(`Tags: ${db.tags.join(', ')}`);
      console.log('----');
    });
  }

  dbFeatured(results){
    if ( !results.length ) {
      console.log('No featured databases found');
      return;
    }

    console.log(`Found ${results.length} featured database(s)`);
    console.log('----');
    results.forEach(db => {
      console.log(`Name: ${db.organization.name}/${db.name}`);
      console.log(`Title: ${db.title}`);
      if( db.url ) console.log(`URL: ${db.url}`);
      console.log('----');
    });
  }

  tables(result=[]) {
    result.forEach(table => {
      console.log(` - ${table.table_name} (${table.table_type})`);
    });
  }

  schemaUserAccess(result) {
    result.schema = (result.schema || []).join(', ');
    if( result.tables ) {
      for( let table in result.tables ) {
        result.tables[table] = result.tables[table].join(', ');
      }
    }
    this.yaml(result);
  }

  dbUsers(users) {
    let obj = {};

    users.forEach(user => {
      obj[user.name] = {
        type : user?.pgFarmUser?.type || 'POSTGRES_ONLY',
        privileges: (user.pgPrivileges || []).join(', ')
      }
    });

    this.yaml(obj);
  }

  dbAdminOnlyMsg() {
    return colors.green('(Database Admins Only)');
  }

  pgFarmAdminOnlyMsg() {
    return colors.yellow('(PG Farm Admins Only)');
  }

  orgUsers(users) {
    // let obj = {};
    users = users.map(u => {
      let obj = {};
      obj[u.username] = u.isAdmin ? 'Admin' : 'User';
      obj.instances = u.instances.map(i => {
        return `${i.name} (${i.databases.join(', ')}): ${i.role}`;
      })
      return obj;
    });

    this.yaml(users);
  }

  instances(instances) {
    instances.forEach(i => this.instance(i));
  }

  instance(i) {
    console.log(`${i.name}:`);
    if( i.organization ) {
      console.log(`  - Organization: ${i.organization.name}`);
    }
    if( i.databases ) {
      console.log(`  - Database(s): ${(i.databases || []).map(d => d.name).join(', ')}`);
    }
    console.log(`  - State: ${i.state}`);
  }

  connections(connections) {

  }

  /**
   * @method publicUserSummary
   * @description Print the public user status and the tables/views the public user
   * has direct READ or WRITE permissions on, per database.
   *
   * @param {Object} summary public user summary from the api
   */
  publicUserSummary(summary) {
    let instName = (summary.organization ? summary.organization+'/' : '')+summary.instance;
    let status = summary.enabled ? colors.green('ENABLED') : colors.yellow('DISABLED');

    console.log(`Public user: ${summary.username}`);
    console.log(`Instance: ${instName} (${summary.instanceState})`);
    console.log(`Status: ${status}`);
    console.log(`Anonymous PostgREST API access: ${summary.pgRestAnonymous ? 'on' : 'off'}`);

    let logins = summary.recentLogins || {};
    let last = logins.lastLogin ? new Date(logins.lastLogin).toISOString() : 'never';
    console.log(`Last public SQL login (gateway): ${last}, logins in last 30 days: ${logins.count30d || 0}`);
    console.log(colors.gray('  Note: anonymous PostgREST API requests are not tracked in login activity.'));

    if( !summary.instanceRunning ) {
      console.log(colors.yellow(`Instance is not running (${summary.instanceState}), permissions not available. Start the instance to see permissions.`));
      return;
    }

    if( summary.roleExists === false ) {
      console.log('Postgres role does not exist on the instance, no permissions.');
      return;
    }

    console.log();
    this.publicUserPermissions(summary);
  }

  /**
   * @method publicUserPermissions
   * @description Print the per database READ/WRITE table/view permission lists for the public user
   *
   * @param {Object} summary public user summary from the api
   */
  publicUserPermissions(summary) {
    let databases = summary.databases || [];
    let counts = summary.counts || {read: 0, write: 0, other: 0};

    console.log(`Public user permissions (direct grants) across ${databases.length} database(s): `+
      `${counts.write} table/view(s) with WRITE, ${counts.read} with READ`+
      (counts.other ? `, ${counts.other} with other privileges` : ''));

    if( !databases.length ) {
      console.log('  No table or view permissions found.');
    }

    for( let db of databases ) {
      console.log(`  Database: ${db.database}`);

      let write = db.tables.filter(t => t.access === 'WRITE');
      let read = db.tables.filter(t => t.access === 'READ');
      let other = db.tables.filter(t => t.access === 'OTHER');

      this._printTableList('WRITE', write);
      this._printTableList('READ', read);
      if( other.length ) this._printTableList('OTHER', other);

      if( db.schemas.length ) {
        console.log(`    Schemas: ${db.schemas.map(s => s.name+' ('+s.privileges.join(', ')+')').join(', ')}`);
      }
      if( db.databasePrivileges.length ) {
        console.log(`    Database privileges: ${db.databasePrivileges.join(', ')}`);
      }
      if( db.defaultPrivilegeCount ) {
        console.log(`    Default privilege entries: ${db.defaultPrivilegeCount}`);
      }
    }

    if( summary.errors?.length ) {
      console.log(colors.red('  Errors reading permissions:'));
      summary.errors.forEach(e => console.log(colors.red(`    ${e.database}: ${e.message}`)));
    }
  }

  /**
   * @method _printTableList
   * @description print a labeled list of tables/views
   *
   * @param {String} label access label
   * @param {Array<Object>} tables
   */
  _printTableList(label, tables) {
    console.log(`    ${label} (${tables.length}):`);
    tables.forEach(t => {
      let extra = t.columnLevel ? ', column level' : '';
      console.log(`      - ${t.schema}.${t.name} (${t.type}${extra})`);
    });
  }

  /**
   * @method publicUserSteps
   * @description Print the planned or performed steps for a public user enable/disable
   *
   * @param {Array<String>} steps
   * @param {String} label
   */
  publicUserSteps(steps=[], label='Steps') {
    console.log(`${label}:`);
    steps.forEach((step, i) => console.log(`  ${i+1}. ${step}`));
  }

  /**
   * @method publicUserReport
   * @description Print the admin public user report
   *
   * @param {Array<Object>} rows
   */
  publicUserReport(rows=[]) {
    let enabled = rows.filter(r => r.publicUserEnabled);
    console.log(`${enabled.length} of ${rows.length} instance(s) have the public user enabled`);
    console.log(colors.gray('Note: login activity is public SQL logins via the gateway only. Anonymous PostgREST API requests are not tracked.'));
    console.log();

    for( let row of rows ) {
      let name = (row.organization ? row.organization+'/' : '_/')+row.instance;
      let status = row.publicUserEnabled ? colors.green('ENABLED') : colors.gray('disabled');
      let last = row.lastPublicLogin ? new Date(row.lastPublicLogin).toISOString() : 'never';
      console.log(`${name} [${row.state}] ${status}`);
      console.log(`  Databases: ${(row.databases || []).join(', ') || 'none'}`);
      if( row.publicUserEnabled ) {
        console.log(`  Last public SQL login: ${last}, last 30 days: ${row.publicLogins30d}`);
      }
      if( row.summary ) {
        if( row.summary.skipped ) {
          console.log(colors.yellow(`  Permissions: skipped (${row.summary.skipped})`));
        } else if( row.summary.error ) {
          console.log(colors.red(`  Permissions: error (${row.summary.error})`));
        } else {
          let c = row.summary.counts || {};
          console.log(`  Permissions: ${c.write || 0} WRITE, ${c.read || 0} READ table/view(s)`);
        }
      }
    }
  }

}

const print = new Print();
export default print;
