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

  async list(onlyUsers=false, showId=false) {
    let resp = await fetch(`${config.host}/api/admin/database?onlyMine=${onlyUsers}`, {
      method: 'GET',
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to list databases', await resp.text());
      return;
    }

    let body = await resp.json();

    body.forEach((database) => {
      let out = `${database.name}`;
      if( showId ) {
        out += ` (${database.id})`;
      }
      console.log(out);
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

  async addUser(name, user) {
    let {organization, database} = this.parseOrg(name);
    if( !organization ) organization = '_';

    let resp = await fetch(`${config.host}/api/admin/database/${organization}/${database}/${user}`, {
      method: 'PUT',
      headers: headers()
    });

    if( resp.status !== 204 ) {
      console.error(resp.status, 'Unable to add user', await resp.text());
      return;
    }

    console.log(`Added user ${user} to database ${database}`);
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

}

const database = new Database();
export default database;