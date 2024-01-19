import {Router} from 'express';
import model from '../../models/admin.js';
import keycloak from '../../../../lib/keycloak.js';
import handleError from '../handle-errors.js';

const router = Router();

router.post('/instance', keycloak.protect('admin'), async (req, res) => {
  try {
    let instance = req.body;
    let id = await model.createInstance(instance.name, instance);
    res.status(200).json({id});
  } catch(e) {
    handleError(e, res);
  }
});

router.post('/:instance/:user', keycloak.protect('admin'), async (req, res) => {
  try {
    let instance = req.params.instance;
    let user = req.params.user.replace(/@.*$/, '');
    let id = await model.addUser(instance, user);
    res.status(200).json({id});
  } catch(e) {
    handleError(e, res);
  }
});

export default router;