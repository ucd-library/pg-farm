import {Router} from 'express';
import keycloak from '../../../../lib/keycloak.js';
import handleError from '../handle-errors.js';
import pgClient from '../../../../lib/pg-admin-client.js';

const router = Router();

router.get('/connections', keycloak.protect('admin'), async (req, res) => {
  try {
    let opts = {
      open: true
    };

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

export default router;