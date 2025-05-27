import {Router} from 'express';
import {admin as model, instance as instanceModel, backup, database} from '../../../../models/index.js';
import keycloak from '../../../../lib/keycloak.js';
import client from '../../../../lib/pg-admin-client.js';
import handleError from '../handle-errors.js';
import remoteExec from '../../../../lib/pg-helper-remote-exec.js';
import {middleware as contextMiddleware} from '../../../../lib/context.js';

const router = Router();

router.get('/', async (req, res) => {
  try {
    let resp = await instanceModel.list(req.query);
    res.json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:organization/:instance',
  contextMiddleware,
  keycloak.protect('instance-user'),
  async (req, res) => {
  try {
    let resp = req.context.instance;
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

router.post('/',
  contextMiddleware,
  keycloak.protect('admin'),
  async (req, res) => {
  try {
    let result = await instanceModel.create(req.ctx, req.body);
    res.status(201).json(result);
  } catch(e) {
    handleError(res, e);
  }
});

router.put('/:organization/:instance/:user',
  contextMiddleware,
  keycloak.protect('instance-admin'),
  async (req, res) => {

  try {
    let user = req.params.user;
    let parent = req.query.parent;

    // do not let api create special users, for now
    let type = req.query.type || 'USER';
    if( type !== 'USER' && type !== 'ADMIN' && type !== 'SERVICE_ACCOUNT') {
      throw new Error('Invalid type: '+type);
    }
    const userArg = {username: user, type, parent};
    await model.createUser(req.context, userArg);
    res.json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

router.patch('/:organization/:instance/:user',
  contextMiddleware,
  keycloak.protect('instance-admin'),
  async (req, res) => {

  try {
    let user = req.params.user;

    // do not let api create special users, for now
    let type = req.query.type || 'USER';
    if( type !== 'USER' && type !== 'ADMIN') {
      throw new Error('Invalid type: '+type);
    }

    await model.updateUser(req.context, user, type);
    res.json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

router.delete('/:organization/:instance/:user',
  contextMiddleware,
  keycloak.protect('instance-admin'),
  async (req, res) => {

  try {
    let user = req.params.user;

    if( user === (req.user.username || req.user.preferred_username) ) {
      throw new Error('Cannot delete yourself');
    }

    let success = await model.deleteUser(req.context, user);
    res.status(204).json({success});
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/stop',
  contextMiddleware,
  keycloak.protect('admin'),
  async (req, res) => {
  try {
    let resp = await model.stopInstance(req.context);

    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/start',
  contextMiddleware,
  keycloak.protect('admin'),
  async (req, res) => {
  try {
    let force = req.query.force === 'true';

    let resp = await model.startInstance(req.context, {
      force,
      waitForPgRest: true,
      startPgRest: true
    });
    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/restart',
  contextMiddleware,
  keycloak.protect('admin'),
  async (req, res) => {
  try {
    let resp = await instanceModel.restart(req.context);
    res.status(200).json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/backup',
  contextMiddleware,
  keycloak.protect('admin'),
  async (req, res) => {
  try {
    let resp = await remoteExec(req.context.instance.hostname, '/backup');

    res.status(resp.status).send(await resp.text());
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/sync-users',
  contextMiddleware,
  keycloak.protect('admin'),
  async (req, res) => {
  try {

    let result = await instanceModel.remoteSyncUsers(req.context,
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

router.post('/:organization/:instance/archive',
  contextMiddleware,
  keycloak.protect('admin'),
  async (req, res) => {
  try {
    let {instance, organization} = req.context;
    let resp = await backup.remoteArchive(instance.name, organization.name);
    res.status(resp.status).send(await resp.text());
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/restore',
  contextMiddleware,
  keycloak.protect('admin'),
  async (req, res) => {
  try {
    let resp = await model.restoreInstance(req.context);
    res.status(resp.status).send(await resp.text());
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/sleep',
  contextMiddleware,
  keycloak.protect('admin'),
  async (req, res) => {
  try {
    await model.sleepInstances(req.context);
    res.status(200).send('ok');
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:instance/resize',
  contextMiddleware,
  keycloak.protect('admin'),
  async (req, res) => {
  try {
    let resp = await instanceModel.resizeVolume(req.context, req.query.size);
    res.status(200).json(resp);
  } catch(e) {
    handleError(res, e);
  }
});


export default router;
