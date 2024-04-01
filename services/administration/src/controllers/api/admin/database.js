import {Router} from 'express';
import {admin as model, pgRest, database, instance, user} from '../../../../../models/index.js';
import keycloak from '../../../../../lib/keycloak.js';
import handleError from '../../handle-errors.js';

const router = Router();

router.post('/', keycloak.protect('admin'), async (req, res) => {
  try {
    await model.ensureDatabase(req.body);
    res.status(201).json(await database.get(req.body.name || req.body.database, req.body.organization));
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/', keycloak.setUser, async (req, res) => {
  try {
    let opts = {};
    if( req.query.onlyMine === 'true' ) {
      if( !req.user ) {
        throw new Error('You must provide an authorization token to view your instances');
      }
      opts.username = req.user.username;
    }

    res.json(await model.getDatabases(opts));
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:organization/:database/grant/schema-access/:schema/:user', keycloak.protect('*:admin'), async (req, res) => {
  try {
    let organization = req.params.organization;
    if( organization === '_' ) {
      organization = null;
    }

    let resp = await user.remoteGrantSchemaAccess(
      req.params.database, 
      organization, 
      req.params.schema, 
      req.params.user,
      req.query.permissions
    );
    res.status(200).json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:database/link/:remoteOrg/:remoteDb', keycloak.protect('*:admin'), async (req, res) => {
  try {
    let organization = req.params.organization;
    if( organization === '_' ) {
      organization = null;
    }
    let remoteOrg = req.params.remoteOrg;
    if( remoteOrg === '_' ) {
      remoteOrg = null;
    }

    let resp = await database.remoteLink(
      req.params.database, 
      organization,
      req.params.remoteDb,
      remoteOrg,
      req.query
    );
    res.status(200).json(resp);
  } catch(e) {
    handleError(res, e);
  }
});


router.get('/:organization/:database/restart/api', keycloak.protect('admin'), async (req, res) => {
  try {
    let organization = req.params.organization;
    if( organization === '_' ) {
      organization = null;
    }

    let database = req.params.database;
    let resp = await pgRest.restart(database, organization);
    res.status(200).json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:organization/:database/init', keycloak.protect('admin'), async (req, res) => {
  try {
    let organization = req.params.organization;
    if( organization === '_' ) {
      organization = null;
    }
    let dbName = req.params.database;

    let inst = await instance.getByDatabase(dbName, organization);
    await instance.initInstanceDb(inst.instance_id, organization);
    await database.ensurePgDatabase(inst.name, organization, dbName);
    await pgRest.initDb(inst.instance_id, organization);

    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

export default router;