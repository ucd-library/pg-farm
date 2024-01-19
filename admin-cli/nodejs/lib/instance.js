import fetch from 'node-fetch';
import headers from './fetch-headers.js';
import {config} from './config.js';

class Instances {

  async create(opts) {
    let resp = await fetch(`${config.host}/api/admin/instance`, {
      method: 'POST',
      headers: headers({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify(opts)
    });

    if( resp.status !== 201 ) {
      console.error(resp.status, 'Unable to create instance', await resp.text());
      return;
    }

    let body = await resp.json();
    console.log(`Created instance ${opts.name} with id ${body.id}`);
  }

  async addUser(instance, user) {
    let resp = await fetch(`${config.host}/api/admin/${instance}/${user}`, {
      method: 'PUT',
      headers: headers()
    });

    if( resp.status !== 204 ) {
      console.error(resp.status, 'Unable to add user', await resp.text());
      return;
    }

    console.log(`Added user ${user} to instance ${instance}`);
  }

}

const instance = new Instances();
export default instance;