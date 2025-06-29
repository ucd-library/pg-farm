import { databaseModel } from '../../lib/index.js'
import print from './print.js';

class Database {

  parseOrg(dbName) {
    if (dbName.match('/')) {
      let parts = dbName.split('/');
      return {
        organization: parts[0],
        database: parts[1]
      };
    }

    return {
      organization: null,
      database: dbName
    };
  }

  async get(name, opts) {
    let { organization, database } = this.parseOrg(name);
    let resp = await databaseModel.get(organization, database);

    print.display(resp, opts.output, print.database);
    process.exit(0);
  }

  async search(searchParams, opts) {
    let resp;

    try {
      let { request, id } = databaseModel.search(searchParams);
      await request
      resp = databaseModel.getSearchResult(id);
    } catch (e) {
      resp = e;
    }

    print.display(resp, opts.output, print.dbSearch);
    process.exit(0);
  }

  async create(database, opts) {
    let resp;
    if (database.organization === '_') {
      database.organization = null;
    }

    try {
      resp = await databaseModel.create(database);
    } catch (e) {
      resp = e;
    }

    print.display(resp, opts.output, print.database);
    process.exit(0);
  }

  async update(name, opts) {
    let { organization, database } = this.parseOrg(name);
    if (!organization) organization = '_';

    let resp;
    try {
      resp = await databaseModel.update(organization, database, opts);
    } catch (e) {
      resp = e;
    }

    print.display(resp, opts.output);
    process.exit(0);
  }

  async showUsers(name, opts) {
    let { organization, database } = this.parseOrg(name);
    if (!organization) organization = '_';

    let resp = await databaseModel.getUsers(organization, database);

    print.display(resp, opts.output, print.dbUsers);
    process.exit(0);
  }

  async showSchemas(name, opts) {
    let { organization, database } = this.parseOrg(name);
    if (!organization) organization = '_';

    let resp = await databaseModel.getSchemas(organization, database);

    print.display(resp, opts.output,);
    process.exit(0);
  }

  async showTables(name, schema, opts) {
    let { organization, database } = this.parseOrg(name);
    if (!organization) organization = '_';

    let resp = await databaseModel.getSchemaTables(organization, database, schema);

    print.display(resp, opts.output, print.tables);
    process.exit(0);
  }

  async showSchemaUserAccess(name, schema, user, opts) {
    let { organization, database } = this.parseOrg(name);
    if (!organization) organization = '_';

    let resp = await databaseModel.getSchemaUserAccess(organization, database, schema, user);

    print.display(resp, opts.output, print.schemaUserAccess);
    process.exit(0);
  }

  async restartApi(name, opts) {
    let { organization, database } = this.parseOrg(name);
    if (!organization) organization = '_';

    let resp = await databaseModel.restartApi(organization, database);

    print.display(resp, opts.output, print.schemaUserAccess);
    process.exit(0);
  }

  async exposeTableToApi(name, table, opts) {
    let { organization, database } = this.parseOrg(name);
    if (!organization) organization = '_';

    let resp = await databaseModel.exposeTableToApi(organization, database, table);

    print.display(resp, opts.output, print.schemaUserAccess);
    process.exit(0);
  }

  async updateApiCache(name, opts) {
    let { organization, database } = this.parseOrg(name);
    if (!organization) organization = '_';

    let resp = await databaseModel.updateApiCache(organization, database);

    print.display(resp, opts.output, print.schemaUserAccess);
    process.exit(0);
  }

  async init(name, opts) {
    let { organization, database } = this.parseOrg(name);
    if (!organization) organization = '_';

    let resp = await databaseModel.init(organization, database);

    print.display(resp, opts.output);
    process.exit(0);
  }

  async link(name, remoteName, opts) {
    let local = this.parseOrg(name);
    if (!local.organization) local.organization = '_';

    let remote = this.parseOrg(remoteName);
    if (!remote.organization) remote.organization = '_';

    let flags = {
      localSchema: opts.localSchema,
      remoteSchema: opts.remoteSchema
    };

    let resp = await databaseModel.link(local, remote, flags);

    print.display(resp, opts.output);
  }

  async setSchemaUserAccess(name, schemaTable, username, access, opts) {
    let { organization, database } = this.parseOrg(name);
    if (!organization) organization = '_';

    let resp = await databaseModel.setSchemaUserAccess(organization, database, schemaTable, username, access);

    if( Array.isArray(resp) ) {
      resp = {
        payload: resp.map(r => r.payload)
      }
    }

    print.display(resp, opts.output);
    process.exit(0);
  }

  async addFeatured(name, opts) {
    let { organization, database } = this.parseOrg(name);
    let resp;
    try {
      resp = await databaseModel.addToFeaturedList(organization, database, opts);
    } catch (e) {
      resp = e;
    }
    print.display(resp, opts.output);
    process.exit(0);
  }

  async getFeatured(orgName, opts){
    let resp;
    try {
      resp = await databaseModel.getFeaturedList(orgName);
    } catch (e) {
      resp = e;
    }
    print.display(resp, opts.output, print.dbFeatured);
    process.exit(0);
  }

  async removeFeatured(name, opts) {
    let { organization, database } = this.parseOrg(name);
    let resp;
    try {
      resp = await databaseModel.removeFromFeaturedList(organization, database, opts.organizationList);
    } catch (e) {
      resp = e;
    }
    print.display(resp, opts.output);
    process.exit(0);
  }

}

const database = new Database();
export default database;
