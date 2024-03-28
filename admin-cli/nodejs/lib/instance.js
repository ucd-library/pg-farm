import fetch from 'node-fetch';
import headers from './fetch-headers.js';
import {config} from './config.js';

class Instances {

  async create(opts) {
    // instance = formatInstName(instance);

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

  async addUser(instance, user, opts={}) {
    instance = formatInstName(instance);

    let flags = [];
    if( opts.admin ) {
      flags.push('type=ADMIN');
    }
    flags = flags.length > 0 ? '?'+flags.join('&') : '';

    let resp = await fetch(`${config.host}/api/admin/instance/${instance}/${user}${flags}`, {
      method: 'PUT',
      headers: headers()
    });

    if( resp.status !== 204 ) {
      console.error(resp.status, 'Unable to add user', await resp.text());
      return;
    }

    console.log(`Added user ${user} to instance ${instance}`);
  }

  async stop(instance) {
    instance = formatInstName(instance);

    let resp = await fetch(`${config.host}/api/admin/instance/${instance}/stop`, {
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to stop instance', await resp.text());
      return;
    }

    console.log(`Stopped instance ${instance}`);
  }

  async start(instance, opts={}) {
    instance = formatInstName(instance);

    let params = new URLSearchParams(opts);
    if( opts.force ) {
      params.set('force', true);
    }
    params = params.size > 0 ? '?'+params.toString() : '';

    let resp = await fetch(`${config.host}/api/admin/instance/${instance}/start${params}`, {
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to start instance', await resp.text());
      return;
    }

    console.log(`Started instance ${instance}`);
  }

  async restart(instance) {
    instance = formatInstName(instance);

    let resp = await fetch(`${config.host}/api/admin/instance/${instance}/restart`, {
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to restart instance', await resp.text());
      return;
    }

    console.log(`Restarted instance ${instance}`);
  }


  async backup(instance) {
    instance = formatInstName(instance);
    let resp = await fetch(`${config.host}/api/admin/instance/${instance}/backup`, {
      method: 'POST',
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to backup instance', await resp.text());
      return;
    }

    console.log(`Started instance backup: ${instance}`);
  }

  async archive(instance) {
    instance = formatInstName(instance);
    let resp = await fetch(`${config.host}/api/admin/instance/${instance}/archive`, {
      method: 'POST',
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to archive instance', await resp.text());
      return;
    }

    console.log(`Started instance archive: ${instance}`);
  }

  async restore(instance) {
    instance = formatInstName(instance);
    let resp = await fetch(`${config.host}/api/admin/instance/${instance}/restore`, {
      method: 'POST',
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to restore instance', await resp.text());
      return;
    }

    console.log(`Started instance restore: ${instance}`);
  }

  async syncUsers(instance) {
    instance = formatInstName(instance);
    let resp = await fetch(`${config.host}/api/admin/instance/${instance}/sync-users`, {
      method: 'POST',
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to sync instance users', await resp.text());
      return;
    }

    console.log(`Instance user syncd: ${instance}`);
  }

}

function formatInstName(name) {
  if( !name.match(/\//) ) {
    name = '_/'+name;
  }
  if( !name.match(/\/inst-/) ) {
    name = name.split('/').join('/inst-');
  }
  return name;
}

const instance = new Instances();
export default instance;