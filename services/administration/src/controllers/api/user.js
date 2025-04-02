import {Router} from 'express';
import keycloak from '../../../../lib/keycloak.js';
import handleError from '../handle-errors.js';
import {user} from '../../../../models/index.js';

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

export default router;
