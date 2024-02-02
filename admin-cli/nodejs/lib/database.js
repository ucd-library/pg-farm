import fetch from 'node-fetch';
import headers from './fetch-headers.js';
import {config} from './config.js';

class Database {

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
    console.log(`Created database ${opts.name} with id ${body.id} on instance ${body.instance}`);
    if( body.organization ) {
      console.log(`  -> Organization: ${body.organization}`);
    }
  }

  async addUser(database, user) {
    let resp = await fetch(`${config.host}/api/admin/database/${database}/${user}`, {
      method: 'PUT',
      headers: headers()
    });

    if( resp.status !== 204 ) {
      console.error(resp.status, 'Unable to add user', await resp.text());
      return;
    }

    console.log(`Added user ${user} to database ${database}`);
  }

  async restartApi(database) {
    let resp = await fetch(`${config.host}/api/admin/database/${database}/restart/api`, {
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