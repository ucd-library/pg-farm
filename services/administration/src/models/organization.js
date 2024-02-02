import client from '../../../lib/pg-admin-client.js';

class OrganizationModel {

  get(nameOrId) {
    return client.getOrganization(nameOrId);
  }

  async exists(name) {
    try {
      let org = await this.getOrganization(name);
      return org;
    } catch(e) {}

    return false;
  }

  /**
   * @method create
   * @description create a new organization
   * 
   * @param {String} name name of the organization 
   * @param {Object} opts
   * @param {String} opts.description description of the organization
   * @param {String} opts.url url of the organization
   *  
   * @returns {Promise<Object>}
   */
  async create(name, opts) {
    let exists = await this.organizationExists(name);
    if( exists ) {
      throw new Error('Organization already exists: '+name);
    }

    return client.createOrganization(name, opts);
  }

}

const instance = new OrganizationModel();
export default instance;