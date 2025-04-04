import logger from '../lib/logger.js';
import client from '../lib/pg-admin-client.js';

class OrganizationModel {

  constructor() {
    this.METADATA_FIELDS = ['title', 'url', 'description', 'logo', 'email', 'phone'];
    this.API_FIELDS = [
      'organization_id', 'name', 'title', 'description', 'url',
      'description', 'email', 'phone', 'created_at', 'updated_at',
      'logo_file_type', 'database_count'
    ];
  }

  async get(nameOrId, columns) {
    if ( !columns ) {
      columns = this.API_FIELDS;
    }
    const org = await client.getOrganization(nameOrId, columns);
    if ( org.database_count !== undefined ) {
      org.database_count = parseInt(org.database_count);
    }
    return org;
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
    this._convertLogoToBytes(opts);

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

    this._convertLogoToBytes(metadata);

    logger.info('Updating organization metadata', org.name, metadata);

    await client.setOrganizationMetadata(org.organization_id, metadata);
  }

  _convertLogoToBytes(metadata) {
    if ( metadata.logo ){
      const logo = Buffer.from(metadata.logo.split(',')[1], 'base64');
      const logoFileType = metadata.logo.split(';')[0].split(':')[1];
      metadata.logo = logo;
      metadata['logo_file_type'] = logoFileType;
    } else if ( Object.keys(metadata).includes('logo') ){
      metadata.logo = null;
      metadata['logo_file_type'] = null;
    }
  }

  async getUsers(nameOrId) {
    return client.getOrganizationUsers(nameOrId);
  }


}

const instance = new OrganizationModel();
export default instance;
