import {Router} from 'express';
import keycloak from '../../../../lib/keycloak.js';
import handleError from '../handle-errors.js';
import {organization, user} from '../../../../models/index.js';
import pgClient from '../../../../lib/pg-admin-client.js';

const router = Router();

router.get('/me', keycloak.protect('logged-in'), async (req, res) => {
  try {
    let resp = await user.getPgFarmUser(req.user.username);
    const payload = {
      userId: resp.user_id,
      username: resp.username,
      firstName: resp.first_name,
      lastName: resp.last_name,
      middleName: resp.middle_name,
      createdAt: resp.created_at
    }
    return res.json(payload);
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/me/db', keycloak.protect('logged-in'), async (req, res) => {
  try {
    let opts = {
      username: req.user.username,
      organization: req.query.org
    }
    let resp = await pgClient.getDatabases(opts);
    resp = resp.map(db => {
      return {
        databaseId: db.database_id,
        instanceId: db.instance_id,
        organizationId: db.organization_id,
        username: db.username,
        userType: db.user_type
      }
    });

    return res.json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

export default router;
