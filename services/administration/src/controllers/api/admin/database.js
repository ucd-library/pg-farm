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

router.patch(
  '/:organization/:database/metadata', 
  keycloak.protect('{instance}-admin'), 
  async (req, res) => {
  
  try {
    let organization = req.params.organization;
    if( organization === '_' ) {
      organization = null;
    }

    let resp = await database.setMetadata(
      req.params.database, 
      organization,
      req.body
    );
    res.status(200).json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/', async (req, res) => {
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

router.post('/search', async (req, res) => {
  try {
    let opts = {
      text : req.body.text,
      tags : req.body.tags,
      organization : req.body.organization,
      limit : req.body.limit || 10,
      offset : req.body.offset || 0
    };

    res.json(await model.search(opts));
  } catch(e) {
    handleError(res, e);
  }
});

router.put('/:organization/:database/grant/:schema/:user/:permission', 
  keycloak.protect('{instance}-admin'), 
  async (req, res) => {
  
  try {
    let organization = req.params.organization;
    if( organization === '_' ) {
      organization = null;
    }

    let resp = await user.remoteGrant(
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

router.post('/:organization/:database/link/:remoteOrg/:remoteDb', 
  keycloak.protect('{instance}-admin'), 
  async (req, res) => {
  
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
    await pgRest.initDb(dbName, inst.instance_id, organization);

    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

export default router;