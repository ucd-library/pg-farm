import {Router} from 'express';
import keycloak from '../../../../lib/keycloak.js';
import handleError from '../handle-errors.js';
import { serviceAccount } from '../../../../models/index.js';

const router = Router();

router.post('/', keycloak.protect('admin'), async (req, res) => {
  try {
    const { name, parent, description } = req.body;

    if( !name ) return res.status(400).json({ error: 'name is required' });
    if( !parent ) return res.status(400).json({ error: 'parent is required' });
    if( !description ) return res.status(400).json({ error: 'description is required' });

    const result = await serviceAccount.create(parent, name, description);
    return res.status(201).json(result);
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:name/rotate', keycloak.protect('logged-in'), async (req, res) => {
  try {
    const isAdmin = req.user?.roles?.includes('admin') || false;
    const result = await serviceAccount.rotatePassword(
      req.params.name,
      req.user.username,
      { isAdmin }
    );

    const body = JSON.stringify(result, null, 2);
    res.set('Content-Type', 'application/json');
    res.set('Content-Disposition', 'attachment; filename="service-account.json"');
    return res.send(body);
  } catch(e) {
    handleError(res, e);
  }
});

export default router;
