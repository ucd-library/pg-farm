import {Router} from 'express';
import keycloak from '../../../../lib/keycloak.js';
import handleError from '../handle-errors.js';
import pgClient from '../../../../lib/pg-admin-client.js';
import { admin } from '../../../../models/index.js';

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

router.get('/sleep-instances', keycloak.protect('admin'), async (req, res) => {
  try {
    let resp = await admin.sleepInstances();
    res.json(resp.rows);
  } catch(e) {
    handleError(res, e);
  }
});


export default router;