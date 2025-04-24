import { create } from 'domain';
import pgAdminClient from './pg-admin-client.js';

const store = new WeakMap();

async function middleware(req, res, next) {
  let organization = req.params.organization || req.query.organization || req.body?.organization;
  let database = req.params.database || req.query.database || req.body?.database;
  let instance = req.params.instance || req.query.instance || req.body?.instance;

  let context = await createContext({
    user : req.user,
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
  let context = {
    user : obj.user,
    corkTraceId : obj.corkTraceId
  };

  if( obj.organization ) {
    if( obj.organization === '_' ) {
      context.organization = {name : null};
    } else {
      try {
        context.organization = await pgAdminClient.getOrganization(obj.organization);
      } catch(e) {
        context.organization = {name : obj.organization};
      }
    }
  }

  if( obj.database ) {
    try {
      context.database = await pgAdminClient.getDatabase(obj.database, context.organization?.name);
    } catch(e) {
      context.database = {name : obj.database};
    }
    context.fullDatabaseName = (context?.organization?.name || '_') + '/' + context.database?.name;
  }

  if( obj.instance ) {
    try {
      context.instance = await pgAdminClient.getInstance(obj.instance, context.organization?.name);
    } catch(e) {
      context.instance = {name : obj.instance};
    }
  } else if( context.database ) {
    try {
      context.instance = await pgAdminClient.getInstance(
        context.database.instance_name || context.database.instance_id, 
        context.organization?.name
      );
    } catch(e) {}
  }

  context.logSignal = {
    organization : context.organization?.name,
    database : context.fullDatabaseName,
    instance : context.instance?.name,
    user : obj.user?.username,
    corkTraceId : obj.corkTraceId
  }

  for( let key in context.logSignal ) {
    if( context.logSignal[key] === undefined ) {
      delete context.logSignal[key];
    }
  }

  return context;
}

function getContext(obj) {
  if( typeof obj !== 'string' ) {
    if( obj.corkTraceId && store.has(obj.corkTraceId) ) {
      return store.get(obj.corkTraceId);
    }
    return obj;
  }
  return store.get(obj);
}

export default {middleware, getContext, createContext, store};