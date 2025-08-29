import utils from '../../../../lib/utils.js';
import logger from '../../../../lib/logger.js';
import instanceModel from '../../../../models/instance.js'

/**
 * Middleware that checks if a given instance is alive by attempting to connect to its host and port.
 * If the instance is not alive, it responds with a 503 status code.
 */

function createMiddleware(opts={}) {
  async function isInstanceAlive(req, res, next) {
    if( opts.useAliveFlag === true && req.query.isAlive !== 'true' ) {
      return next();
    }

    if( !req.context ) {
      logger.error('No context found in request', req.logSignal);
      return res.status(500).json({error: 'No context found in request'});
    }
    if( !req.context.instance ) {
      logger.error('No instance found in request context', req.logSignal);
      return res.status(500).json({error: 'No instance found in request context'});
    }

    let instance = req.context.instance;

    try {
      await utils.isAlive(instance.host, instance.port, 2000);
      return next();
    } catch(e) {
      return res.status(503).json({
        error: 'Instance is not responsive', 
        details: e.message,
        organization: ctx.organization.name,
        name: ctx.instance.name,
        state: ctx.instance.state,
        podStatus: await instanceModel.getPodStatus(req.context)
      });
    }
  }

  return isInstanceAlive;
}
export default createMiddleware;
