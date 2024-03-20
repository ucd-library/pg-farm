import {Router} from 'express';
import {admin as model, pgRest, database, instance} from '../../../../../models/index.js';
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

router.put('/:organization/:database/:user', keycloak.protect('admin'), async (req, res) => {
  try {
    let organization = req.params.organization;
    if( organization === '_' ) {
      organization = null;
    }

    let database = req.params.database;
    let user = req.params.user.replace(/@.*$/, '');

    // do not let api create special users, for now
    let type = req.query.type || 'USER';
    if( type !== 'USER' && type !== 'ADMIN' ) {
      throw new Error('Invalid type: '+type);
    }

    let id = await model.createUser(database, organization, user);
    res.status(204).json({id});
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
    let database = req.params.database;

    let inst = await instance.getByDatabase(database, organization);
    await instance.initInstanceDb(inst.instance_id, organization);
    await pgRest.initDb(inst.instance_id, organization, database);

    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

export default router;