import {Router} from 'express';
import keycloak from '../../../../lib/keycloak.js';
import handleError from '../handle-errors.js';
import {user} from '../../../../models/index.js';

const router = Router();

router.get('/me', keycloak.protect('logged-in'), async (req, res) => {
  try {
    // let resp = await user.getUser(req.user.username);
    // res.json(resp);
    return res.json(req.user);
  } catch(e) {
    handleError(res, e);
  }
});

export default router;
