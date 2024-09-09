import yaml from 'js-yaml';

class Print {

  constructor() {
    this.schemaUserAccess = this.schemaUserAccess.bind(this);
  }


  display(payload, format, textPrint) {
    if( payload instanceof Error ) {
      payload = {error: true, message: payload.message, stack: payload.stack};
    }

    if( payload.error ) {
      let status = payload?.response?.status;

      if( payload?.payload?.message && status ) {
        payload = {
          status, 
          message: payload.payload.message,
          stack: payload.payload.stack
        };
      }

      if( format === 'json' ) {
        this.json(payload, true);
      } else {
        this.yaml(payload, true);
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
    if( result.tables ) {
      for( let table in result.tables ) {
        result.tables[table] = result.tables[table].join(', ');
      }
    }
    this.yaml(result);
  }

}

const print = new Print();
export default print;