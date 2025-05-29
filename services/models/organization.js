import logger from '../lib/logger.js';
import client from '../lib/pg-admin-client.js';
import config from '../lib/config.js';
import { getContext } from '../lib/context.js';

class OrganizationModel {

  constructor() {
    this.METADATA_FIELDS = ['title', 'url', 'description', 'logo', 'email', 'phone'];
    this.API_FIELDS = [
      'organization_id', 'name', 'title', 'description', 'url',
      'description', 'email', 'phone', 'created_at', 'updated_at',
      'logo_file_type', 'database_count'
    ];
  }

  /**
   * @method get
   * @description get an organization by name or id
   * 
   * @param {String|Object} ctx context object or id 
   * @param {Array} columns columns to select 
   * @returns 
   */
  async get(ctx, columns) {
    ctx = getContext(ctx);

    if ( !columns ) {
      columns = this.API_FIELDS;
    }
    const org = await client.getOrganization(ctx.organization.name, columns);
    if ( org.database_count !== undefined ) {
      org.database_count = parseInt(org.database_count);
    }
    return org;
  }

  /**
   * @method exists
   * @description check if an organization exists
   * 
   * @param {String|Object} ctx context object or id
   * @returns {Promise<Boolean>}
   */
  async exists(ctx) {
    try {
      return await this.get(ctx);
    } catch(e) {}
    return false;
  }

  async search(opts){
    const columns = this.API_FIELDS.map(col => `org.${col}`).join(', ');

    const params = [];
    if (opts?.user ){
      params.push(opts.user);
    }


    let sql = `
      SELECT ${columns}
      from ${config.adminDb.views.ORGANIZATION_DATABASE_COUNT} org
      WHERE 1=1
      ${opts?.user ? `
        AND EXISTS (
          SELECT 1
          FROM ${config.adminDb.tables.INSTANCE_USER} iu
          JOIN ${config.adminDb.tables.INSTANCE} i ON i.instance_id = iu.instance_id
          JOIN ${config.adminDb.tables.USER} u ON u.user_id = iu.user_id
          WHERE i.organization_id = org.organization_id
            AND u.username = $1
        )
        ` : ''}
      ORDER BY org.title
    `;

    let results = await client.query(sql , params);
    const items = results.rows.map(row => {
      row.database_count = parseInt(row.database_count);
      return row;
    });
    return {
      items : items,
      total : results.rowCount,
      query : opts
    }
  }

  /**
   * @method create
   * @description create a new organization
   *
   * @param {String|Object} ctx
   *
   * @returns {Promise<Object>}
   */
  async create(ctx, organization) {
    ctx = getContext(ctx);

    if( !organization.name && organization.title ) {
      organization.name = organization.title.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');
    }
    if( !organization.title ) {
      organization.title = organization.name;
    }
    organization.name = organization.name.toLowerCase().trim().replace(/[^a-z0-9]/g, '-');

    let exists = await this.exists(organization);
    if( exists ) {
      throw new Error('Organization already exists: '+organization.name);
    }
    this._convertLogoToBytes(organization);

    logger.info('Creating organization', ctx.logSignal);
    await client.createOrganization(organization);

    // set a context
    await ctx.update({
      organization: organization.name
    });

    return this.get(ctx);
  }

  async update(ctx) {
    ctx = getContext(ctx);

    if( !ctx.organization.organization_id ) {
      throw new Error('Context organization_id is required');
    }

    let update = {};
    let props = Object.keys(ctx.organization);
    for( let prop of props ) {
      if( !this.METADATA_FIELDS.includes(prop) ) {
        continue;
      }
      update[prop] = ctx.organization[prop];
    }

    this._convertLogoToBytes(update);

    logger.info('Updating organization', ctx.logSignal);

    await client.setOrganizationMetadata(org.organization_id, update);
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

  /**
   * @method getUsers
   * @description get all users of the organization
   *
   * @param {String|Object} ctx context object or id
   * @returns {Promise<Array>}
   */
  async getUsers(ctx) {
    ctx = getContext(ctx);
    return client.getOrganizationUsers(ctx.organization.name);
  }

}

const instance = new OrganizationModel();
export default instance;
