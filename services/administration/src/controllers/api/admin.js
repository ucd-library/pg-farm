import {Router} from 'express';
import keycloak from '../../../../lib/keycloak.js';
import handleError from '../handle-errors.js';
import pgClient from '../../../../lib/pg-admin-client.js';
import { admin, user, publicUser } from '../../../../models/index.js';
import {createContext} from '../../../../lib/context.js';
import config from '../../../../lib/config.js';
import {middleware as contextMiddleware} from '../../../../lib/context.js';

const router = Router();

router.get('/connections', keycloak.protect('admin'), async (req, res) => {
  try {
    let opts = {};

    if( req.query.active ) {
      opts.active = req.query.active === 'true';
    }
    if( req.query.username ) {
      opts.username = req.query.username;
    }
    if( req.query.database ) {
      opts.database = req.query.database;
    }

    let resp = await pgClient.getConnections(opts);
    res.json(resp.rows);
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/connection-log/:sessionId', keycloak.protect('admin'), async (req, res) => {
  try {
    let resp = await pgClient.getConnectionLog(req.params.sessionId);
    res.json(resp.rows);
  } catch(e) {
    handleError(res, e);
  }
});

/**
 * Public user report.  Lists all instances with public user enabled state and
 * public SQL login activity (gateway logins only, PostgREST anonymous traffic is not
 * recorded).  ?details=true adds a permission summary for running instances with the
 * public user enabled.  Sleeping instances are not woken.
 */
router.get('/public-user-report', keycloak.protect('admin'), async (req, res) => {
  try {
    let rows = await pgClient.getPublicUserReport();
    let details = req.query.details === 'true';

    let resp = [];
    for( let row of rows ) {
      let item = {
        organization : row.organization_name,
        instance : row.instance_name,
        state : row.state,
        publicUserEnabled : row.public_user_enabled,
        databases : row.databases,
        lastPublicLogin : row.last_login,
        publicLogins30d : row.count_30d
      };

      if( details && row.public_user_enabled ) {
        if( row.state !== config.pgInstance.states.RUN ) {
          item.summary = {skipped: 'instance not running'};
        } else {
          try {
            let ctx = await createContext({
              organization : row.organization_name,
              instance : row.instance_name
            });
            let summary = await publicUser.getPermissionSummary(ctx);
            item.summary = {
              counts : summary.counts,
              databases : summary.databases.map(db => ({
                database : db.database,
                counts : db.counts
              })),
              errors : summary.errors
            };
          } catch(e) {
            item.summary = {error: e.message};
          }
        }
      }

      resp.push(item);
    }

    res.json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/sleep-instances', keycloak.protect('admin'), async (req, res) => {
  try {
    let resp = await admin.sleepInstances(req.context);
    res.json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/ucd-iam-profile/search/:username',
  contextMiddleware,
  keycloak.protect('instance-admin'),
  async (req, res) => {
  try {
    let success = false;
    let resp = await user.fetchUcdIamData(req.params.username);
    if ( resp ) success = true;
    res.json({success, resp});
  } catch(e) {
    handleError(res, e);
  }
});

router.put('/ucd-iam-profile/:username', keycloak.protect('admin'), async (req, res) => {
  try {
    let success = false;
    if ( ! await user.pgFarmUserExists(req.params.username) ) {
      return res.status(404).json({error: 'User is not a pgFarm user'});
    }
    let resp = await user.fetchAndUpdateUcdIamData(req.params.username);
    if ( resp ) success = true;
    res.json({success, resp});
  } catch(e) {
    handleError(res, e);
  }
});

export default router;
