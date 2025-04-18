import {Router} from 'express';
import {admin as model, instance as instanceModel, backup, database} from '../../../../models/index.js';
import keycloak from '../../../../lib/keycloak.js';
import client from '../../../../lib/pg-admin-client.js';
import handleError from '../handle-errors.js';
import remoteExec from '../../../../lib/pg-helper-remote-exec.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    let resp = await instanceModel.list(req.query);
    res.json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:organization/:instance', async (req, res) => {
  try {
    let resp = await instanceModel.get(req.params.instance);
    let lastEvent = await client.getLastDatabaseEvent(resp.instance_id);
    if( lastEvent ) {
      resp.lastDatabaseEvent = {
        event_type : lastEvent.event_type,
        timestamp : lastEvent.timestamp,
        database_name : lastEvent.database_name,
        database_id : lastEvent.database_id
      }
    }
    res.json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/', keycloak.protect('admin'), async (req, res) => {
  try {
    let instance = req.body;
    let id = await model.createInstance(instance.name, instance);
    res.status(201).json({id});
  } catch(e) {
    handleError(res, e);
  }
});

router.put('/:organization/:instance/:user', 
  keycloak.protect('instance-admin'), 
  async (req, res) => {
  
    try {
    let {instance, organization} = getOrgAndIsntFromReq(req);
    // let user = req.params.user.replace(/@.*$/, '');
    let user = req.params.user;
    let parent = req.query.parent;

    // do not let api create special users, for now
    let type = req.query.type || 'USER';
    if( type !== 'USER' && type !== 'ADMIN' && type !== 'SERVICE_ACCOUNT') {
      throw new Error('Invalid type: '+type);
    }

    await model.createUser(instance, organization, user, type, {parent});
    res.json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

router.patch('/:organization/:instance/:user', 
  keycloak.protect('instance-admin'), 
  async (req, res) => {
  
    try {
    let {instance, organization} = getOrgAndIsntFromReq(req);
    let user = req.params.user;

    // do not let api create special users, for now
    let type = req.query.type || 'USER';
    if( type !== 'USER' && type !== 'ADMIN') {
      throw new Error('Invalid type: '+type);
    }

    await model.updateUser(instance, organization, user, type);
    res.json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

router.delete('/:organization/:instance/:user', 
  keycloak.protect('instance-admin'), 
  async (req, res) => {

  try {
    let {instance, organization} = getOrgAndIsntFromReq(req);
    let user = req.params.user;

    if( user === (req.user.username || req.user.preferred_username) ) {
      throw new Error('Cannot delete yourself');
    }

    let success = await model.deleteUser(instance, organization, user);
    res.status(204).json({success});
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/stop', keycloak.protect('admin'), async (req, res) => {
  try {
    let {instance, organization} = getOrgAndIsntFromReq(req);
    let resp = await model.stopInstance(instance, organization);
    
    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/start', keycloak.protect('admin'), async (req, res) => {
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

router.post('/:organization/:instance/restart', keycloak.protect('admin'), async (req, res) => {
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

    let resp = await remoteExec(instance.hostname, '/backup');

    res.status(resp.status).send(await resp.text());
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/sync-users', keycloak.protect('admin'), async (req, res) => {
  try {
    let {instance, organization} = getOrgAndIsntFromReq(req);

    let result = await instanceModel.remoteSyncUsers(instance, organization, 
      req.query['update-passwords'] === 'true',
      req.query['hard-reset'] === 'true'
    );


    let status = 0;
    result.forEach(r => {
      if( r.response.status > status ) {
        status = r.response.status;
      }
    });

    res.status(status).json(result);
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

router.post('/sleep', keycloak.protect('admin'), async (req, res) => {
  try {
    await model.sleepInstances();
    res.status(200).send('ok');
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/resize', keycloak.protect('admin'), async (req, res) => {
  try {
    let {instance, organization} = getOrgAndIsntFromReq(req);
    let resp = await instanceModel.resizeVolume(instance, organization, req.query.size);
    res.status(200).json(resp);
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