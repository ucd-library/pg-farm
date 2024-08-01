import {Router} from 'express';
import {admin as model, pgRest, database, instance, user, organization} from '../../../../../models/index.js';
import pgAdminClient from '../../../../../lib/pg-admin-client.js';
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
  keycloak.protect('instance-admin'), 
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

const GET_DB_COLUMNS = ["organization_name", "organization_title","organization_id",
  "instance_name","instance_state","instance_id",
  "database_name","database_title","database_short_description",
  "database_description","database_url","database_tags","database_id"
];

const USER_COLUMNS = ["username","type"];

router.get('/:organization/:database/metadata', async (req, res) => {
  try {

    let db = await database.get(req.params.database, req.params.organization, GET_DB_COLUMNS);
    let resp = {
      id : db.database_id,
      name : db.database_name,
      title : db.database_title,
      shortDescription : db.database_short_description,
      description : db.database_description,
      url : db.database_url,
      tags : db.database_tags,
      organization : {
        id : db.organization_id,
        name : db.organization_name,
        title : db.organization_title
      },
      instance : {
        name : db.instance_name,
        state : db.instance_state,
        id : db.instance_id
      }
    };

    if( req.user && resp.instance.id ) {
      let users = await pgAdminClient.getInstanceUsers(resp.instance.id, USER_COLUMNS);

      let user = users.find(user => user.username === req.user.username);
      if( user ) {
        resp.isAdmin = user.type === 'ADMIN';
        resp.users = users;
      }
    }

    res.json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:organization/:database/users', 
  keycloak.protect('instance-admin'),
  async (req, res) => {
  try {
    res.json(await database.getDatabaseUsers(req.params.organization, req.params.database));
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:organization/:database/schemas', 
  keycloak.protect('instance-admin'),
  async (req, res) => {
  try {
    res.json(await database.listSchema(req.params.organization, req.params.database));
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:organization/:database/schema/:schema/tables', 
  keycloak.protect('instance-admin'),
  async (req, res) => {
  try {
    res.json(await database.listTables(
      req.params.organization, 
      req.params.database, 
      req.params.schema
    ));
  } catch(e) {
    handleError(res, e);
  }
});

router.get('/:organization/:database/schema/:schema/table/:tableName/access',
  keycloak.protect('instance-admin'),
  async (req, res) => {
  try {
    res.json(await database.getTableAccess(
      req.params.organization,
      req.params.database,
      req.params.schema,
      req.params.tableName
    ));
  } catch(e) {
    handleError(res, e);
  }
});


router.get('/:organization/:database/schema/:schema/access/:username',
  keycloak.protect('instance-admin'),
  async (req, res) => {
  try {
    res.json(await database.getTableAccessByUser(
      req.params.organization,
      req.params.database,
      req.params.schema,
      req.params.username
    ));
  } catch(e) {
    handleError(res, e);
  }
});

router.put('/:organization/:database/grant/:schema/:user/:permission', 
  keycloak.protect('instance-admin'), 
  async (req, res) => {
  
  try {
    let organization = req.params.organization;
    if( organization === '_' ) {
      organization = null;
    }

    let resp;
    if( req.params.schema === '_' ) {
      resp = await user.grantDatabaseAccess(
        req.params.database, 
        organization, 
        req.params.schema, 
        req.params.user,
        req.query.permission
      );
    } else {
      resp = await user.grant(
        req.params.database, 
        organization, 
        req.params.schema, 
        req.params.user,
        req.query.permission
      );
    }

    res.status(200).json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

router.put('/:organization/:database/revoke/:schema/:user/:permission', 
  keycloak.protect('instance-admin'), 
  async (req, res) => {
  
  try {
    let organization = req.params.organization;
    if( organization === '_' ) {
      organization = null;
    }

    let resp;
    if( req.params.schema === '_' ) {
      resp = await user.revokeDatabaseAccess(
        req.params.database, 
        organization, 
        req.params.user,
        req.query.permission
      );
    } else {
      resp = await user.revoke(
        req.params.database, 
        organization, 
        req.params.schema, 
        req.params.user,
        req.query.permission
      );
    }

    res.status(200).json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

router.post('/:organization/:database/link/:remoteOrg/:remoteDb', 
  keycloak.protect('instance-admin'), 
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