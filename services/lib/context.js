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

  if( req.method !== 'POST' ) {
    if( organization && context.notFound.organization ) {
      return res.status(404).json({error: `Organization '${organization}' not found`});
    }

    if( database && context.notFound.database ) {
      return res.status(404).json({error: `Database '${database}' not found`});
    }

    if( instance && context.notFound.instance ) {
      return res.status(404).json({error: `Instance '${instance}' not found`});
    }
  }

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
    this.requestorRoles = null;
    this.notFound = {};

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
    context.notFound = clone(this.notFound);
    context.logSignal = clone(this.logSignal);
    return context;
  }

  async update(obj) {

    if( obj.corkTraceId ) {
      this.corkTraceId = obj.corkTraceId;
    }

    if( obj.organization ) {
      if( obj.organization === '_' || obj.organization === null || obj.organization === undefined || obj.organization === 'null' ) {
        this.organization = {name : null};
      } else {
        try {
          this.organization = await pgAdminClient.getOrganization(obj.organization);
          if( this.notFound.organization ) {
            delete this.notFound.organization;
          }
        } catch(e) {
          if( typeof obj.organization === 'object') {
            this.organization = obj.organization;
          } else if( typeof obj.organization === 'string' ) {
            this.organization = {name : obj.organization};
          } else {
            throw new Error('Invalid organization value in context update');
          }
          this.notFound.organization = true;
        }
      }
    }

    if( obj.database ) {
      try {
        this.database = await pgAdminClient.getDatabase({
          database: {name: obj?.database?.name || obj.database},
          organization: {name: this.organization?.name}
        });
        if( this.notFound.database ) {
          delete this.notFound.database;
        }
      } catch(e) {
        if( typeof obj.database === 'object' ) {
          this.database = obj.database;
        } else if( typeof obj.database === 'string' ) {
          this.database = {name : obj.database};
        } else {
          throw new Error('Invalid database value in context update');
        }
        this.notFound.database = true;
      }
    }

    if( obj.instance && (typeof obj.instance === 'string' || obj.instance.name) ) {
      obj.instance = modelUtils.getInstanceName(obj.instance);
      try {
        this.instance = await pgAdminClient.getInstance({
          instance: {name: obj.instance},
          organization: {name: this.organization?.name}
        });
        if( this.notFound.instance ) {
          delete this.notFound.instance;
        }
      } catch(e) {
        if( typeof obj.instance === 'object' ) {
          this.instance = obj.instance;
        } else if( typeof obj.instance === 'string' ) {
          this.instance = {name : obj.instance};
        } else {
          throw new Error('Invalid instance value in context update');
        }
        this.notFound.instance = true;
      }
    } else if( this.database ) {
      try {
        this.instance = await pgAdminClient.getInstance({
          instance: {name: this.database.instance_name || this.database.instance_id},
          organization: {name: this.organization?.name}
        });
        if( this.notFound.instance ) {
          delete this.notFound.instance;
        }
      } catch(e) {
        this.notFound.instance = true;
      }
    }

    if( obj.requestor ) {
      if( typeof obj.requestor === 'string' ) {
        this.requestor = obj.requestor;
      } else if( typeof obj.requestor === 'object' ) {
        this.requestor = obj.requestor.username;
      }
    }

    if( !this.requestorRoles ) {
      this.requestorRoles = {};
    }

    if( this.instance && this.requestor ) {
      try {
        let instUser = await pgAdminClient.getInstanceUser(this, this.requestor);
        this.requestorRoles.instance = instUser?.user_type || '';
      } catch(e) {
        this.requestorRoles.instance = '';
      }
    }

    if( this.organization && this.requestor ) {
      try {
        let orgUser = await pgAdminClient.getOrganizationUser(this.requestor, this.organization.name);
        this.requestorRoles.organization = orgUser?.user_type || '';
      } catch(e) {
        this.requestorRoles.organization = '';
      }
    }

    // final cleanup of log signal
    this.cleanLogSignal();
  }

  async populateRequestorRoles() {
    if( !this.requestorRoles ) this.requestorRoles = {};

    if( this.instance && this.requestor ) {
      let instUser = await pgAdminClient.getInstanceUser(this, this.requestor);
      this.requestorRoles.instance = instUser?.user_type || '';
    }

    if( this.organization && this.requestor ) {
      let orgUser = await pgAdminClient.getOrganizationUser(this.requestor, this.organization.name);
      this.requestorRoles.organization = orgUser?.user_type || '';
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

/**
 * @method requireContext
 * @description express middleware factory that returns a 404 if any of the
 * given context types were not found when the context was created.  Use after
 * the context middleware on routes that operate on existing resources, where
 * the method-based notFound check is skipped (eg POST action routes).
 *
 * @param {...String} types context types to require: 'organization', 'database' or 'instance'
 *
 * @returns {Function} express middleware
 */
function requireContext(...types) {
  return (req, res, next) => {
    for( let type of types ) {
      if( !req.context?.notFound?.[type] ) continue;

      let name = req.params[type] || req.query[type] || req.body?.[type] ||
        req.context[type]?.name;
      let label = type.charAt(0).toUpperCase() + type.slice(1);

      return res.status(404).json({error: `${label} '${name}' not found`});
    }
    next();
  };
}

export {middleware, getContext, createContext, requireContext, store};
