import {Router} from 'express';
import {admin as model, instance as instanceModel, backup} from '../../../../../models/index.js';
import keycloak from '../../../../../lib/keycloak.js';
import handleError from '../../handle-errors.js';
import fetch from 'node-fetch';

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
    let {instance, organization} = getOrgAndIsntFromReq(req);
    let resp = await model.stopInstance(instance, organization);
    
    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:organization/:instance/start', keycloak.protect('admin'), async (req, res) => {
  try {
    let {instance, organization} = getOrgAndIsntFromReq(req);
    let force = req.query.force === 'true';

    let resp = await model.startInstance(instance, organization, {
      force,
      waitForPgRest: true,
      startPgRest: true
    });
    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:organization/:instance/restart', keycloak.protect('admin'), async (req, res) => {
  try {
    let {instance, organization} = getOrgAndIsntFromReq(req);
    let resp = await instanceModel.restart(instance, organization);
    res.status(200).json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/backup', keycloak.protect('admin'), async (req, res) => {
  try {
    let {instance, organization} = getOrgAndIsntFromReq(req);
    instance = await instanceModel.get(instance, organization);

    let url = `http://${instance.hostname}:3000/backup`;
    let resp = await fetch(url, {
      method: 'POST'
    });

    res.status(resp.status).send(await resp.text());
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/sync-users', keycloak.protect('admin'), async (req, res) => {
  try {
    let {instance, organization} = getOrgAndIsntFromReq(req);
    let resp = await instanceModel.remoteSyncUsers(instance, organization);
    res.status(resp.status).send(await resp.text());
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/archive', keycloak.protect('admin'), async (req, res) => {
  try {
    let {instance, organization} = getOrgAndIsntFromReq(req);
    let resp = await backup.remoteArchive(instance, organization);
    res.status(resp.status).send(await resp.text());
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/restore', keycloak.protect('admin'), async (req, res) => {
  try {
    let {instance, organization} = getOrgAndIsntFromReq(req);
    let resp = await model.restoreInstance(instance, organization);
    res.status(resp.status).send(await resp.text());
  } catch(e) {
    handleError(res, e);
  }
});

function getOrgAndIsntFromReq(req) {
  let organization = req.params.organization;
  if( organization === '_' ) {
    organization = null;
  }
  let instance = req.params.instance;
  if( !instance.startsWith('inst-') ) {
    instance = 'inst-'+instance;
  }
  return {organization, instance};
}

export default router;