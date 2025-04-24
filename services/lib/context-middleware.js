import pgAdminClient from './pg-admin-client.js';

async function contextMiddleware(req, res, next) {
  let context = {
    user : req.user,
    corkTraceId : req.corkTraceId
  };

  let organization = req.params.organization || req.query.organization || req.body?.organization;
  let database = req.params.database || req.query.database || req.body?.database;
  let instance = req.params.instance || req.query.instance || req.body?.instance;

  if( organization ) {
    context.organization = await pgAdminClient.getOrganization(req.params.organization);
  }
  if( database ) {
    context.database = await pgAdminClient.getDatabase(req.params.database);
    context.databaseName = (context?.organization?.name || '_') + '/' + context.database?.name;
  }
  if( instance ) {
    context.instance = await pgAdminClient.getInstance(req.params.instance);
  }

  context.logSignals = {
    organization : context.organization?.name,
    database : context.databaseName,
    instance : context.instance?.name,
    user : req.user?.username,
    corkTraceId : req.corkTraceId
  }

  for( let key in context.logSignals ) {
    if( context.logSignals[key] === undefined ) {
      delete context.logSignals[key];
    }
  }
  

  next();
}

export default contextMiddleware;