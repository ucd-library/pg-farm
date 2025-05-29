import modelUtils from '../models/utils.js'
import pgAdminClient from './pg-admin-client.js';
import clone from 'clone';
import {v4 as uuid4} from 'uuid';

const store = new Map();

async function middleware(req, res, next) {
  let organization = req.params.organization || req.query.organization || req.body?.organization;
  let database = req.params.database || req.query.database || req.body?.database;
  let instance = req.params.instance || req.query.instance || req.body?.instance;

  let context = await createContext({
    corkTraceId : req.corkTraceId,
    organization,
    database,
    instance
  });

  req.context = context;
  res.context = context;

  store.set(req.corkTraceId, context);
  res.on('finish', () => {
    store.delete(req.corkTraceId);
  });

  next();
}

/**
 * @method createContext
 * @description create a context object for interacting with the models.  Note this does not
 * register the context with the store.
 *
 * @param {Object} obj
 * @param {String} obj.organization name or id of the organization
 * @param {String} obj.database name or id of the database
 * @param {String} obj.instance name or id of the instance
 * @param {Object} obj.user user object
 * @param {String} obj.corkTraceId context cork trace id
 *
 * @returns {Promise<Object>} context object
 */
async function createContext(obj) {
  if( !obj.corkTraceId ) {
    obj.corkTraceId = uuid4();
  }

  let context = new InstanceDatabaseContext(obj);
  await context.update(obj);
  return context;
}

class InstanceDatabaseContext {

  constructor() {
    this._corkTraceId = null;
    this._organization = null;
    this._database = null;
    this._instance = null;
    this._requestor = null;

    this.fullDatabaseName = null;
    this.logSignal = {};
  }

  // setters and getters for updating the logSignal object

  // corkTraceId is used for logging and tracing
  set corkTraceId(corkTraceId) {
    this._corkTraceId = corkTraceId;
    this.logSignal.corkTraceId = corkTraceId;
  }
  get corkTraceId() {
    return this._corkTraceId;
  }

  set organization(organization) {
    this._organization = organization;
    this.logSignal.organization = organization?.name;
  }
  get organization() {
    return this._organization;
  }

  set database(database) {
    this._database = database;
    this.fullDatabaseName = (this?.organization?.name || '_') + '/' + database?.name;
    this.logSignal.database = this.fullDatabaseName;
  }
  get database() {
    return this._database;
  }

  set instance(instance) {
    this._instance = instance;
    this.logSignal.instance = instance?.name;
  }
  get instance() {
    return this._instance;
  }

  set requestor(requestor) {
    this._requestor = requestor;
    this.logSignal.requestor = requestor;
  }
  get requestor() {
    return this._requestor;
  }

  cleanLogSignal() {
    for( let key in this.logSignal ) {
      if( this.logSignal[key] === undefined ) {
        delete this.logSignal[key];
      }
    }
  }


  clone() {
    let context = new InstanceDatabaseContext();
    context.corkTraceId = this.corkTraceId;
    context.organization = clone(this.organization);
    context.database = clone(this.database);
    context.instance = clone(this.instance);
    context.fullDatabaseName = this.fullDatabaseName;
    context.requestor = this.requestor;
    context.logSignal = clone(this.logSignal);
    return context;
  }

  async update(obj) {
    if( obj.corkTraceId ) {
      this.corkTraceId = obj.corkTraceId;
    }

    if( obj.organization ) {
      if( obj.organization === '_' ) {
        this.organization = {name : null};
      } else {
        try {
          this.organization = await pgAdminClient.getOrganization(obj.organization);
        } catch(e) {
          this.organization = {name : obj.organization};
        }
      }
    }

    if( obj.database ) {
      try {
        this.database = await pgAdminClient.getDatabase({
          database: {name: obj.database},
          organization: {name: this.organization?.name
        }});
      } catch(e) {
        this.database = {name : obj.database};
      }
    }

    if( obj.instance ) {
      obj.instance = modelUtils.getInstanceName(obj.instance);
      try {
        this.instance = await pgAdminClient.getInstance({
          instance: {name: obj.instance},
          organization: {name: this.organization?.name}
        });
      } catch(e) {
        this.instance = {name : obj.instance};
      }
    } else if( this.database ) {
      try {
        this.instance = await pgAdminClient.getInstance({
          instance: {name: this.database.instance_name || this.database.instance_id},
          organization: {name: this.organization?.name}
        });
      } catch(e) {}
    }

    if( obj.requestor ) {
      if( typeof obj.requestor === 'string' ) {
        this.requestor = obj.requestor;
      } else if( typeof obj.requestor === 'object' ) {
        this.requestor = obj.requestor.username;
      }
    }

    this.cleanLogSignal();
  }

}


function getContext(obj) {
  if( typeof obj !== 'string' ) {
    return obj;
  }
  return store.get(obj);
}

export {middleware, getContext, createContext, store};
