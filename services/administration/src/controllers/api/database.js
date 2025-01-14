import {Router} from 'express';
import {database, pgRest, instance, user, organization, admin} from '../../../../models/index.js';
import keycloak from '../../../../lib/keycloak.js';
import handleError from '../handle-errors.js';

const router = Router();

const GET_DB_COLUMNS = ["organization_name", "organization_title","organization_id",
  "instance_name","instance_state","instance_id",
  "database_name","database_title","database_short_description",
  "database_description","database_url","database_tags","database_id",
  "database_icon", "database_brand_color"
];

const USER_COLUMNS = ["username","type"];

/** Search */
router.get('/search', search);
router.post('/search', search);

async function search(req, res) {
  try {
    let input = Object.assign({}, req.query, req.body);

    let opts = {
      text : input.text,
      tags : input.tags,
      organization : input.organization,
      limit : input.limit ? parseInt(input.limit) : 10,
      offset : input.offset ? parseInt(input.offset) : 0,
      excludeFeatured : input.excludeFeatured,
      orderBy : input.orderBy
    };

    if( input.onlyMine && req.user ) {
      opts.user = req.user.id;
    }

    let result = await database.search(opts);
    result.items = result.items.map(db => {
      let result = {
        id : db.database_id,
        name : db.database_name,
        title : db.database_title || '',
        shortDescription : db.database_short_description || '',
        description : db.database_description || '',
        icon : db.database_icon || '',
        brandColor : db.database_brand_color || '',
        tags : db.database_tags,
        url : db.database_url || '',
        organization : null,
        state : db.instance_state,
        score : db.rank || -1
      }

      if( db.organization_id ) {
        result.organization = {
          id : db.organization_id,
          name : db.organization_name,
          title : db.organization_title
        }
      }

      return result;
    });

    res.json(result);
  } catch(e) {
    handleError(res, e);
  }
}

/**
 * Aggregations for search
 */
router.get('/aggregations', aggregations);
router.post('/aggregations', aggregations);
async function aggregations(req, res) {
  try {
    let input = Object.assign({}, req.query, req.body);

    let opts = {
      text : input.text,
      tags : input.tags,
      organization : input.organization,
      excludeFeatured : input.excludeFeatured
    };

    if( input.onlyMine && req.user ) {
      opts.user = req.user.id;
    }
    const aggs = Array.isArray(input.aggs) ? input.aggs : (input.aggs || '').split(',');

    let result = await database.aggregations(aggs, opts);
    res.json(result);
  } catch(e) {
    handleError(res, e);
  }
};

/**
 * Manage featured database lists
 */
router.patch('/featured', keycloak.protect('admin'), async (req, res) => patchFeatured(req, res));
router.patch('/featured/:organization', keycloak.protect('organization-admin'),  async (req, res) => patchFeatured(req, res, true));
async function patchFeatured(req, res, organizationList){
  const db = req.body.db;
  const org = req.body.org;
  req.body.organizationList = organizationList;

  try {
    if ( req.body.action === 'remove' ) {
      await database.removeFeatured(db, org, req.body.organizationList);
    } else {
      await database.makeFeatured(db, org, req.body);
    }
    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
}

/**
 * Get featured database lists
 */
router.get('/featured', async (req, res) => getFeatured(res));
router.get('/featured/:organization', async (req, res) => getFeatured(res, req.params.organization));
async function getFeatured(res, organization){
  try {
    let results = await database.getFeatured(organization);
    const resp = results.map(db => {
      let result = {
        id : db.database_id,
        name : db.database_name,
        title : db.database_title || '',
        shortDescription : db.database_short_description || '',
        description : db.database_description || '',
        icon : db.database_icon || '',
        brandColor : db.database_brand_color || '',
        tags : db.database_tags,
        url : db.database_url || '',
        organization : null,
        state : db.instance_state,
        score : db.rank || -1
      }

      if( db.organization_id ) {
        result.organization = {
          id : db.organization_id,
          name : db.organization_name,
          title : db.organization_title
        }
      }

      return result;
    });
    res.json(resp);
  } catch(e) {
    handleError(res, e);
  }
}

/** Get **/
router.get('/:organization/:database', async (req, res) => {
  try {

    let db = await database.get(req.params.database, req.params.organization, GET_DB_COLUMNS);
    let resp = {
      id : db.database_id,
      name : db.database_name,
      title : db.database_title,
      shortDescription : db.database_short_description,
      description : db.database_description,
      icon : db.database_icon,
      brandColor : db.database_brand_color,
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

    res.json(resp);
  } catch(e) {
    handleError(res, e);
  }
});

/** Create **/
router.post('/', keycloak.protect('admin'), async (req, res) => {
  try {
    await admin.ensureDatabase(req.body);
    res.status(201).json(await database.get(req.body.name || req.body.database, req.body.organization));
  } catch(e) {
    handleError(res, e);
  }
});

/** Update Metadata **/
router.patch(
  '/:organization/:database',
  keycloak.protect('instance-admin'),
  async (req, res) => {

  try {
    let organization = req.params.organization;
    if( organization === '_' ) {
      organization = null;
    }

    await database.setMetadata(
      req.params.database,
      organization,
      req.body
    );
    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

/** Restart db pgrest instance **/
router.post('/:organization/:database/restart/api', keycloak.protect('admin'), async (req, res) => {
  try {
    let organization = req.params.organization;
    if( organization === '_' ) {
      organization = null;
    }

    let database = req.params.database;
    await pgRest.restart(database, organization);
    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

/** rerun db init **/
router.post('/:organization/:database/init', keycloak.protect('admin'), async (req, res) => {
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

/** Check if admin */
router.get('/:organization/:database/is-admin', keycloak.protect('instance-admin'), async (req, res) => {
  return res.json({isAdmin: true});
});

/** Get Users **/
router.get('/:organization/:database/users',
  keycloak.protect('instance-admin'),
  async (req, res) => {
  try {
    let dbUsers = await database.getDatabaseUsers(req.params.organization, req.params.database)
    res.json(dbUsers);
  } catch(e) {
    handleError(res, e);
  }
});

/** Get Schemas **/
router.get('/:organization/:database/schemas',
  keycloak.protect('instance-admin'),
  async (req, res) => {
  try {
    res.json(await database.listSchema(req.params.organization, req.params.database));
  } catch(e) {
    handleError(res, e);
  }
});

/** Get Tables **/
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

/** Get Table Access **/
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


/** Get User Schema Access **/
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

/** Grant user schema access **/
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
        req.params.permission
      );
    } else {
      resp = await user.grant(
        req.params.database,
        organization,
        req.params.schema,
        req.params.user,
        req.params.permission
      );
    }

    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

/** Revoke user schema access **/
router.delete('/:organization/:database/revoke/:schema/:user/:permission',
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
        req.params.permission
      );
    } else {
      resp = await user.revoke(
        req.params.database,
        organization,
        req.params.schema,
        req.params.user,
        req.params.permission
      );
    }

    res.status(200).json({success: true});
  } catch(e) {
    handleError(res, e);
  }
});

/** Create foreign data table to PG Farm db **/
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

    let resp = await database.link(
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



export default router;
