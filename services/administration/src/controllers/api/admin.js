import {Router} from 'express';
import model from '../../models/admin.js';
import pgRest from '../../models/pg-rest.js';
import keycloak from '../../../../lib/keycloak.js';
import handleError from '../handle-errors.js';

const router = Router();

router.post('/instance', keycloak.protect('admin'), async (req, res) => {
  try {
    let instance = req.body;
    let id = await model.createInstance(instance.name, instance);
    res.status(201).json({id});
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/instance', keycloak.setUser, async (req, res) => {
  try {
    let opts = {};
    if( req.query.onlyMine === 'true' ) {
      if( !req.user ) {
        throw new Error('You must provide an authorization token to view your instances');
      }
      opts.username = req.user.username;
    }

    let getUserInstances = await model.getInstances(opts);
    res.json(getUserInstances);
  } catch(e) {
    handleError(res, e);
  }
});

router.put('/:instance/:user', keycloak.protect('admin'), async (req, res) => {
  try {
    let instance = req.params.instance;
    let user = req.params.user.replace(/@.*$/, '');
    let id = await model.createUser(instance, user);
    res.status(204).json({id});
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:instance/stop', keycloak.protect('admin'), async (req, res) => {
  try {
    let instance = req.params.instance;
    let resp = await model.stopInstance(instance);
    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:instance/restart/api', keycloak.protect('admin'), async (req, res) => {
  try {
    let instance = req.params.instance;
    let resp = await pgRest.restart(instance);
    res.status(200).json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

export default router;