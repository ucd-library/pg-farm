import logger from '../lib/logger.js';
import client from '../lib/pg-admin-client.js';

class OrganizationModel {

  constructor() {
    this.METADATA_FIELDS = ['title', 'url', 'description'];
  }

  get(nameOrId) {
    return client.getOrganization(nameOrId);
  }

  async exists(name) {
    try {
      let org = await this.get(name);
      return org;
    } catch(e) {}

    return false;
  }

  /**
   * @method create
   * @description create a new organization
   * 
   * @param {String} title name of the organization 
   * @param {Object} opts
   * @param {String} opts.description description of the organization
   * @param {String} opts.url url of the organization
   *  
   * @returns {Promise<Object>}
   */
  async create(title, opts={}) {
    if( !opts.name ) {
      opts.name = title.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
    }

    let exists = await this.exists(opts.name);
    if( exists ) {
      throw new Error('Organization already exists: '+opts.name);
    }

    logger.info('Creating organization', title, opts);
    await client.createOrganization(title, opts);

    return this.get(opts.name);
  }

  async setMetadata(nameOrId, metadata={}) {
    if( Object.keys(metadata).length === 0 ) {
      throw new Error('No metadata fields provided');
    }

    let org = await this.get(nameOrId);
    let props = Object.keys(metadata);
    for( let prop of props ) {
      if( !this.METADATA_FIELDS.includes(prop) ) {
        throw new Error(`Invalid metadata field ${prop}`);
      }
    }

    logger.info('Updating organization metadata', org.name, metadata);

    await client.setOrganizationMetadata(org.organization_id, metadata);
  }

  setUserRole(nameOrId, username, role='') {
    role = role.toUpperCase();
    return client.setOrganizationRole(nameOrId, username, role);
  }

}

const instance = new OrganizationModel();
export default instance;