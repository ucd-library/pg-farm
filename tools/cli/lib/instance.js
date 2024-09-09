import fetch from 'node-fetch';
import headers from './fetch-headers.js';
import { instanceModel, utils, config } from '../../lib/index.js'
import print from './print.js';
import exec from './model-exec-wrapper.js';

class Instances {

  parseOrg(instName) {
    if (instName.match('/')) {
      let parts = instName.split('/');
      return {
        organization: parts[0],
        instance: parts[1]
      };
    }

    return {
      organization: null,
      instance: instName
    };
  }

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

  async addUser(name, user, opts={}) {
    let { organization, instance } = this.parseOrg(name);

    let resp = await exec(instanceModel.addUser(organization, instance, user, opts));

    print.display(resp.payload, opts.output);
    process.exit(0);
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

  async start(name, opts={}) {
    let { organization, instance } = this.parseOrg(name);
    let resp;

    try {
      resp = await instanceModel.start(organization, instance, opts);
    } catch (e) {
      resp = e;
    }

    print.display(resp, opts.output);
    process.exit(0);
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

  async resize(instance, size) {
    instance = formatInstName(instance);

    let params = new URLSearchParams({size});

    let resp = await fetch(`${config.host}/api/admin/instance/${instance}/resize?${params}`, {
      method: 'POST',
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to resize instance', await resp.text());
      return;
    }

    console.log(`Started instance resize: ${instance}`);
    console.log(resp.body);
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