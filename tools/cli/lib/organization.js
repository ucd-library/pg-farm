import { organizationModel } from '../../lib/index.js'
import print from './print.js';

class Organization {

  async get(org, opts) {
    let resp = await organizationModel.get(org, opts);

    print.display(resp, opts.output);
    process.exit(0);
  }

  async getUsers(org, opts) {  
    let resp = await organizationModel.getUsers(org, opts);

    print.display(resp, opts.output, print.orgUsers);
    process.exit(0);
  }

  async create(opts) {
    let resp = await organizationModel.create(opts);

    print.display(resp, opts.output);
    process.exit(0);
  }

  async update(organization, metadata) {
    let resp = await organizationModel.update(organization, metadata);

    print.display(resp, metadata.output);
    process.exit(0);
  }

}

const organization = new Organization();
export default organization;