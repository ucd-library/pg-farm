import {Router} from 'express';
import model from '../../models/admin.js';
import keycloak from '../../../../lib/keycloak.js';
import handleError from '../handle-errors.js';

const router = Router();

router.post('/', keycloak.protect('admin'), async (req, res) => {
  try {
    let instance = req.body;
    let id = await model.createInstance(instance.name, instance);
    res.status(201).json({id});
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:organization/:instance/stop', keycloak.protect('admin'), async (req, res) => {
  try {
    let organization = req.params.organization;
    if( organization === '_' ) {
      organization = null;
    }

    let instance = req.params.instance;
    let resp = await model.stopInstance(organization, instance);
    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

export default router;