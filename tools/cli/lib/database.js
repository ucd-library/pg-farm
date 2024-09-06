import fetch from 'node-fetch';
import headers from './fetch-headers.js';
// import {config} from './config.js';
import {databaseModel, utils, config} from '../../lib/index.js'
import print from './print.js';

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



  async get(name, opts) {
    let {organization, database} = this.parseOrg(name);
    let resp;

    try {
      resp = await databaseModel.get(organization, database);
    } catch(e) {
      resp = e;
    }

    print.display(resp, opts.output, print.database);
    process.exit(0);
  }

  async search(searchParams, opts) {
    let resp;

    try {
      let {request, id} = databaseModel.search(searchParams);
      await request
      resp = databaseModel.getSearchResult(id);
    } catch(e) {
      resp = e;
    }

    print.display(resp.payload, opts.output, print.dbSearch);
    process.exit(0);
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

  async update(name, opts) {
    let {organization, database} = this.parseOrg(name);
    if( !organization ) organization = '_';

    let resp;
    try {
      resp = await databaseModel.update(organization, database, opts);
    } catch(e) {
      resp = e;
    }

    print.display(resp.payload, opts.output);
    process.exit(0);
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

  async link(name, remoteName) {
    let local = this.parseOrg(name);
    if( !local.organization ) local.organization = '_';

    let remote = this.parseOrg(remoteName);
    if( !remote.organization ) remote.organization = '_';

    let resp = await fetch(`${config.host}/api/admin/database/${local.organization}/${local.database}/link/${remote.organization}/${remote.database}`, {
      headers: headers(),
      method: 'POST',
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to link database', await resp.text());
      return;
    }

    console.log(`Link for ${name} to ${remoteName}`);
  }

  async grant(dbName, schemaTable, username, grantType, options) {
    let {organization, database} = this.parseOrg(dbName);
    if( !organization ) organization = '_';

    let resp = await fetch(`${config.host}/api/admin/database/${organization}/${database}/grant/${schemaTable}/${username}/${grantType}`, {
      headers: headers(),
      method: 'PUT',
      body: JSON.stringify(options)
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to grant', await resp.text());
      return;
    }

    console.log(`Granted ${grantType} on ${schemaTable} to ${username}`);
  }

}

const database = new Database();
export default database;