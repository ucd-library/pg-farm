import fetch from 'node-fetch';
import headers from './fetch-headers.js';
import {config} from './config.js';

class Database {

  parseOrg(dbName) {
    if( dbName.match('/') ) {
      let parts = dbName.split('/');
      return {
        organization: parts[0],
        database: parts[1]
      };
    }

    return {
      organization: null,
      database: dbName
    };
  }

  async list(opts) {
    let resp = await fetch(`${config.host}/api/admin/database?onlyMine=${opts.mine}`, {
      method: 'GET',
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to list databases', await resp.text());
      return;
    }

    let body = await resp.json();

    if( opts.json ) { 
      return console.log(body);
    }

    body.sort((a, b) => {
      if( a.database < b.database ) return -1;
      if( a.database > b.database ) return 1;
      return 0;
    });

    body.forEach((db) => {
      console.log(`${db.database}`);
    });
  }

  async create(opts) {
    if( opts.instance && !opts.instance.match(/^inst-/) ) {
      opts.instance = 'inst-'+opts.instance;
    }
 
    let resp = await fetch(`${config.host}/api/admin/database`, {
      method: 'POST',
      headers: headers({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify(opts)
    });

    if( resp.status !== 201 ) {
      console.error(resp.status, 'Unable to create database', await resp.text());
      return;
    }

    let body = await resp.json();
    console.log(`Created database ${body.database_name} with id ${body.database_id} on instance ${body.instance_name}`);
    if( body.organization_name ) {
      console.log(`  -> Organization: ${body.organization_name}`);
    }
  }

  async restartApi(name) {
    let {organization, database} = this.parseOrg(name);
    if( !organization ) organization = '_';

    let resp = await fetch(`${config.host}/api/admin/database/${organization}/${database}/restart/api`, {
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to restart API', await resp.text());
      return;
    }

    console.log(`Restarted API for database ${database}`);
  }

  async init(name) {
    let {organization, database} = this.parseOrg(name);
    if( !organization ) organization = '_';

    let resp = await fetch(`${config.host}/api/admin/database/${organization}/${database}/init`, {
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to re-init database', await resp.text());
      return;
    }

    console.log(`Re-ran init for database ${database}`);
  }

}

const database = new Database();
export default database;