import fetch from 'node-fetch';
import headers from './fetch-headers.js';
import { instanceModel, config } from '../../lib/index.js'
import print from './print.js';
import organization from './organization.js';

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
    let resp = await instanceModel.create(opts);

    print.display(resp, opts.output);
    process.exit(0);
  }

  async list(opts={}) {
    let query = {}
    if( opts.organization ) {
      query.organization = opts.organization;
    }
    if( opts.state ) {
      query.state = opts.state;
    }
    if( opts.limit ) {
      query.limit = opts.limit;
    }
    if( opts.offset ) {
      query.offset = opts.offset;
    }

    let resp = await instanceModel.list(query);
    print.display(resp, opts.output, print.instances);
    process.exit(0);
  }

  async get(name, opts={}) {
    let { organization, instance } = this.parseOrg(name);
    let resp = await instanceModel.get(organization, instance);

    print.display(resp, opts.output, print.instance);
    process.exit(0);
  }

  async addUser(name, user, opts={}) {
    let { organization, instance } = this.parseOrg(name);

    let resp = await instanceModel.addUser(organization, instance, user, opts);

    print.display(resp, opts.output);
    process.exit(0);
  }

  async stop(name, opts={}) {
    let { organization, instance } = this.parseOrg(name);

    let resp = await instanceModel.stop(organization, instance);
    print.display(resp, opts.output);
    process.exit(0);
  }

  async start(name, opts={}) {
    let { organization, instance } = this.parseOrg(name);

    let resp = await instanceModel.start(organization, instance, opts);

    print.display(resp, opts.output);
    process.exit(0);
  }

  async restart(name, opts) {
    let { organization, instance } = this.parseOrg(name);
    let resp = await instanceModel.restart(organization, instance);

    print.display(resp, opts.output);
    process.exit(0);
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