import yaml from 'js-yaml';
import colors from 'colors';

class Print {

  constructor() {
    this.schemaUserAccess = this.schemaUserAccess.bind(this);
    this.orgUsers = this.orgUsers.bind(this);
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
    if( db.organization ) {
      console.log(`Name: ${db.organization.name}/${db.name}`);
    } else if( db.database_name ) {
      console.log(`Name: ${db.organization_name || '_'}/${db.database_name}`);
    } else {
      console.log(`Name: ${db.name}`);
    }
    console.log(`Title: ${db.title || db.database_title}`);
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

  tables(result=[]) {
    result.forEach(table => {
      console.log(` - ${table.table_name} (${table.table_type})`);
    });
  }

  schemaUserAccess(result) {
    result.schema = result.schema.join(', ');
    if( result.tables ) {
      for( let table in result.tables ) {
        result.tables[table] = result.tables[table].join(', ');
      }
    }
    this.yaml(result);
  }

  dbUsers(users) {
    users.forEach(user => {
      console.log(`${user.name}: ${user.access.join(', ')}`);
    });
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

}

const print = new Print();
export default print;