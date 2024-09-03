import fetch from 'node-fetch';
import headers from './fetch-headers.js';
import {config} from './config.js';

class Organization {

  async create(opts) {
    let resp = await fetch(`${config.host}/api/admin/organization`, {
      method: 'POST',
      headers: headers({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify(opts)
    });

    if( resp.status !== 201 ) {
      console.error(resp.status, 'Unable to create organization', await resp.text());
      return;
    }

    let body = await resp.json();
    console.log(`Created organization ${opts.name} with id ${body.id}`);
  }

  async setMetadata(organization, metadata) {
    let resp = await fetch(`${config.host}/api/admin/organization/${organization}/metadata`, {
      method: 'PATCH',
      headers: headers({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify(metadata)
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to set metadata', await resp.text());
      return;
    }

    console.log(`Set metadata for organization ${organization}`);
  }

  async setUserRole(organization, user, role) {
    let resp = await fetch(`${config.host}/api/admin/organization/${organization}/${user}/${role}`, {
      method: 'PUT',
      headers: headers()
    });

    if( resp.status !== 200 ) {
      console.error(resp.status, 'Unable to set user role', await resp.text());
      return;
    }

    console.log(`Set user ${user} to role ${role} for organization ${organization}`);
  }

}

const organization = new Organization();
export default organization;