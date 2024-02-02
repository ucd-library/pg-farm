import {Router} from 'express';
import model from '../../../models/admin.js';
import pgRest from '../../../models/pg-rest.js';
import keycloak from '../../../../../lib/keycloak.js';
import handleError from '../../handle-errors.js';

router.post('/', keycloak.protect('admin'), async (req, res) => {
  try {
    let resp = await model.createDatabase(req.body);
    res.status(201).json(resp);
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

    let databases = await model.getDatabases(opts);
    res.json(databases);
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

    let id = await model.createUser(organization, database, user);
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
    let resp = await pgRest.restart(organization, database);
    res.status(200).json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

export default router;