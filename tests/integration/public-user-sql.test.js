import { assert } from 'chai';
import sinon from 'sinon';
import PG from 'pg';
import { reset, query } from '../helpers/db.js';
import { createOrg, createInstance, createDatabase, createInstanceUser } from '../helpers/fixtures.js';
import { publicUser, user as userModel, instance as instanceModel } from '../../services/models/index.js';
import pgAdminClient from '../../services/lib/pg-admin-client.js';
import pgInstClient from '../../services/lib/pg-instance-client.js';
import config from '../../services/lib/config.js';
import { createContext } from '../../services/lib/context.js';

/**
 * Real SQL tests for the public user enable/disable cycle.  The test postgres container
 * (port 15432) acts as both the admin db and the "instance".  Roles are cluster-wide, so
 * every role created here is dropped in after().
 */

const RAND = Math.random().toString(36).slice(2, 8);
const SCRATCH_DB = `pub_sql_test_${RAND}`;
const GROUP_ROLE = `pub-test-group-${RAND}`;
const ORG = 'pub-sql-org';
const INST = 'inst-pub-sql';
const PUBLIC = config.pgInstance.publicRole.username;
const PUBLIC_PASSWORD = config.pgInstance.publicRole.password;
const AUTHENTICATOR = config.pgRest.authenticator.username;

const BASE_CON = {
  host: 'localhost',
  port: 15432,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
};

/**
 * @function dbQuery
 * @description run a query against a specific database in the test cluster as postgres
 *
 * @param {String} database database name
 * @param {String} sql
 * @param {Array} params
 *
 * @returns {Promise<Object>}
 */
async function dbQuery(database, sql, params) {
  const client = new PG.Client({ ...BASE_CON, database });
  await client.connect();
  try {
    return await client.query(sql, params);
  } finally {
    await client.end().catch(() => {});
  }
}

/**
 * @function roleExists
 * @param {String} role
 * @returns {Promise<Boolean>}
 */
async function roleExists(role) {
  const r = await dbQuery('postgres', 'SELECT 1 FROM pg_roles WHERE rolname = $1', [role]);
  return r.rows.length > 0;
}

/**
 * @function dropRoleEverywhere
 * @description test cleanup.  drop owned in scratch + postgres db then drop role
 *
 * @param {String} role
 */
async function dropRoleEverywhere(role) {
  if( !(await roleExists(role)) ) return;
  for( const db of [SCRATCH_DB, 'postgres'] ) {
    await dbQuery(db, `DROP OWNED BY "${role}"`).catch(() => {});
  }
  await dbQuery('postgres', `DROP ROLE IF EXISTS "${role}"`);
}

describe('public user (real SQL enable/disable cycle)', function () {
  this.timeout(60000);

  let inst, ctx;

  before(async function () {
    // the test cluster must not already have these roles
    if( await roleExists(PUBLIC) ) {
      throw new Error(`Role ${PUBLIC} already exists in the test cluster; refusing to run`);
    }

    await reset();
    await createOrg({ name: ORG, title: 'Public SQL Test Org' });
    inst = await createInstance(ORG, { name: INST, hostname: 'localhost', state: 'RUN' });
    await createDatabase(ORG, INST, { name: SCRATCH_DB });

    await dbQuery('postgres', `CREATE DATABASE ${SCRATCH_DB}`);
    if( !(await roleExists(AUTHENTICATOR)) ) {
      await dbQuery('postgres', `CREATE ROLE "${AUTHENTICATOR}" NOINHERIT LOGIN PASSWORD 'auth-test'`);
    }
    await dbQuery('postgres', `CREATE ROLE "${GROUP_ROLE}" NOLOGIN`);

    await dbQuery(SCRATCH_DB, `
      CREATE SCHEMA api;
      CREATE SCHEMA data;
      CREATE TABLE data.t_read (id serial primary key, v text);
      CREATE TABLE data.t_write (id serial primary key, v text);
      CREATE TABLE data.t_cols (id int, secret text, open text);
      CREATE TABLE data.t_public (id int);
      CREATE TABLE data.t_group (id int);
      CREATE VIEW api.v_existing AS SELECT * FROM data.t_read;
      GRANT SELECT ON data.t_public TO PUBLIC;
      GRANT SELECT ON data.t_group TO "${GROUP_ROLE}";
    `);
  });

  beforeEach(async function () {
    // the instance "host" is the local test cluster
    sinon.stub(pgAdminClient, 'getInstanceByHostname').resolves({ state: 'RUN' });
    sinon.stub(instanceModel, 'getConnection').callsFake(async () => ({ ...BASE_CON }));
    // do not call the UCD IAM api
    sinon.stub(userModel, 'fetchAndUpdateUcdIamData').resolves();
    ctx = await createContext({ organization: ORG, instance: INST });
  });

  afterEach(function () {
    sinon.restore();
  });

  after(async function () {
    await dropRoleEverywhere(PUBLIC);
    await dropRoleEverywhere(GROUP_ROLE);
    await dbQuery('postgres', `DROP DATABASE IF EXISTS ${SCRATCH_DB} WITH (FORCE)`);
    await dbQuery('postgres', `DROP ROLE IF EXISTS "${AUTHENTICATOR}"`).catch(() => {});
    await reset();
  });

  // ── helpers that must not throw when the role is missing ──────────────────────

  describe('with no public role', function () {

    it('getRoleDirectPrivileges returns empty results for a missing role', async function () {
      const privs = await pgInstClient.getRoleDirectPrivileges({ ...BASE_CON, database: SCRATCH_DB }, PUBLIC);
      assert.deepEqual(privs.relations, []);
      assert.deepEqual(privs.schemas, []);
      assert.equal(privs.defaultAclCount, 0);
      assert.deepEqual(privs.databasePrivileges, []);
    });

    it('getSchemasOverview does not throw and reports no public schemas', async function () {
      const resp = await pgInstClient.getSchemasOverview({ ...BASE_CON, database: SCRATCH_DB });
      assert.isAtLeast(resp.rows.length, 2);
      assert.isTrue(resp.rows.every(r => r.is_public === false));
    });

    it('listConnectableDatabases includes postgres and the scratch db, not templates', async function () {
      const dbs = await pgInstClient.listConnectableDatabases(BASE_CON);
      assert.include(dbs, 'postgres');
      assert.include(dbs, SCRATCH_DB);
      assert.notInclude(dbs, 'template0');
      assert.notInclude(dbs, 'template1');
    });

    it('summary reports disabled with no role', async function () {
      const summary = await publicUser.getPermissionSummary(ctx);
      assert.isFalse(summary.enabled);
      assert.isFalse(summary.roleExists);
      assert.deepEqual(summary.databases, []);
    });

  });

  // ── full cycle ────────────────────────────────────────────────────────────────

  describe('enable -> grant -> summary -> disable', function () {

    it('enable creates the admin row, login role and api schema grants', async function () {
      const result = await publicUser.enable(ctx);
      assert.isTrue(result.enabled);
      assert.deepEqual(result.errors, []);

      assert.isTrue(await pgAdminClient.isPublicUserEnabled(inst.instance_id));

      const role = await dbQuery('postgres', 'SELECT rolcanlogin FROM pg_roles WHERE rolname = $1', [PUBLIC]);
      assert.lengthOf(role.rows, 1);
      assert.isTrue(role.rows[0].rolcanlogin);

      // existing api objects are readable (GRANT SELECT ON ALL TABLES)
      const priv = await dbQuery(SCRATCH_DB,
        `SELECT has_table_privilege($1, 'api.v_existing', 'SELECT') AS sel,
                has_schema_privilege($1, 'api', 'USAGE') AS usage`, [PUBLIC]);
      assert.isTrue(priv.rows[0].sel, 'existing api view should be readable');
      assert.isTrue(priv.rows[0].usage);

      // default privileges for future api objects
      const acl = await dbQuery(SCRATCH_DB, `SELECT count(*)::int AS c FROM pg_default_acl`);
      assert.isAtLeast(acl.rows[0].c, 1);

      // authenticator can switch to the public role (PostgREST anon role)
      const member = await dbQuery('postgres', `SELECT pg_has_role($1, $2, 'MEMBER') AS m`, [AUTHENTICATOR, PUBLIC]);
      assert.isTrue(member.rows[0].m);

      // public user can actually log in with the shared password
      const client = new PG.Client({ ...BASE_CON, user: PUBLIC, password: PUBLIC_PASSWORD, database: SCRATCH_DB });
      await client.connect();
      try {
        await client.query('SELECT * FROM api.v_existing');
      } finally {
        await client.end().catch(() => {});
      }
    });

    it('a second enable is safe and keeps the role', async function () {
      const result = await publicUser.enable(ctx);
      assert.isTrue(result.alreadyEnabled);
      assert.isTrue(result.enabled);
      assert.isTrue(await roleExists(PUBLIC));
    });

    it('summary lists only direct READ/WRITE grants', async function () {
      await dbQuery(SCRATCH_DB, `
        GRANT USAGE ON SCHEMA data TO "${PUBLIC}";
        GRANT SELECT ON data.t_read TO "${PUBLIC}";
        GRANT SELECT, INSERT, UPDATE ON data.t_write TO "${PUBLIC}";
        GRANT SELECT (open) ON data.t_cols TO "${PUBLIC}";
        GRANT "${GROUP_ROLE}" TO "${PUBLIC}";
      `);

      const summary = await publicUser.getPermissionSummary(ctx);
      assert.isTrue(summary.enabled);
      assert.isTrue(summary.roleExists);
      assert.deepEqual(summary.errors, []);

      const db = summary.databases.find(d => d.database === SCRATCH_DB);
      assert.ok(db, 'scratch database missing from summary');
      assert.isUndefined(summary.databases.find(d => d.database === 'postgres'),
        'databases without public grants should not be listed');

      const byName = Object.fromEntries(db.tables.map(t => [`${t.schema}.${t.name}`, t]));
      assert.equal(byName['api.v_existing']?.access, 'READ');
      assert.equal(byName['api.v_existing']?.type, 'VIEW');
      assert.equal(byName['data.t_read']?.access, 'READ');
      assert.equal(byName['data.t_read']?.type, 'TABLE');
      assert.equal(byName['data.t_write']?.access, 'WRITE');
      assert.equal(byName['data.t_cols']?.access, 'READ');
      assert.isTrue(byName['data.t_cols']?.columnLevel);

      // not removed by DROP OWNED, so must not be listed
      assert.notProperty(byName, 'data.t_public', 'PUBLIC pseudo-role grants must not be listed');
      assert.notProperty(byName, 'data.t_group', 'inherited grants must not be listed');

      assert.deepEqual(db.counts, { read: 3, write: 1, other: 0 });
      assert.deepEqual(summary.counts, { read: 3, write: 1, other: 0 });

      const schemaNames = db.schemas.map(s => s.name).sort();
      assert.deepEqual(schemaNames, ['api', 'data']);
      assert.isAtLeast(db.defaultPrivilegeCount, 1);
    });

    it('getSchemasOverview reports api as public when the role exists', async function () {
      const resp = await pgInstClient.getSchemasOverview({ ...BASE_CON, database: SCRATCH_DB });
      const api = resp.rows.find(r => r.schema_name === 'api');
      assert.isTrue(api.is_public);
    });

    it('disable dry run returns the summary and changes nothing', async function () {
      const result = await publicUser.disable(ctx, { dryRun: true });
      assert.isTrue(result.dryRun);
      assert.deepEqual(result.summary.counts, { read: 3, write: 1, other: 0 });
      assert.isTrue(await roleExists(PUBLIC));
      assert.isTrue(await pgAdminClient.isPublicUserEnabled(inst.instance_id));
    });

    it('disable terminates sessions, removes all privileges and drops the role', async function () {
      // open a session as the public user that should be terminated
      const session = new PG.Client({ ...BASE_CON, user: PUBLIC, password: PUBLIC_PASSWORD, database: SCRATCH_DB });
      session.on('error', () => {});
      await session.connect();

      const result = await publicUser.disable(ctx);
      assert.isFalse(result.dryRun);
      assert.isFalse(result.enabled);
      assert.deepEqual(result.errors, []);
      assert.deepEqual(result.summary.counts, { read: 3, write: 1, other: 0 },
        'summary of removed permissions should be returned');

      assert.isFalse(await roleExists(PUBLIC), 'role should be dropped');
      assert.isFalse(await pgAdminClient.isPublicUserEnabled(inst.instance_id), 'admin row should be removed');

      const acl = await dbQuery(SCRATCH_DB, `SELECT count(*)::int AS c FROM pg_default_acl`);
      assert.equal(acl.rows[0].c, 0, 'default privileges should be removed');

      let sessionErr;
      try {
        await session.query('SELECT 1');
      } catch (e) { sessionErr = e; }
      assert.ok(sessionErr, 'public session should have been terminated');
      await session.end().catch(() => {});

      // unrelated roles/grants are untouched
      assert.isTrue(await roleExists(GROUP_ROLE));
      const grp = await dbQuery(SCRATCH_DB,
        `SELECT has_table_privilege($1, 'data.t_group', 'SELECT') AS sel`, [GROUP_ROLE]);
      assert.isTrue(grp.rows[0].sel);
    });

    it('public user can no longer log in', async function () {
      const client = new PG.Client({ ...BASE_CON, user: PUBLIC, password: PUBLIC_PASSWORD, database: SCRATCH_DB });
      let err;
      try {
        await client.connect();
      } catch (e) { err = e; }
      await client.end().catch(() => {});
      assert.ok(err, 'login should fail');
    });

    it('a second disable is idempotent', async function () {
      const result = await publicUser.disable(ctx);
      assert.isFalse(result.enabled);
      assert.deepEqual(result.errors, []);
      assert.isFalse(await roleExists(PUBLIC));
    });

    it('re-enable creates a fresh role with only api schema access', async function () {
      const result = await publicUser.enable(ctx);
      assert.isTrue(result.enabled);

      const priv = await dbQuery(SCRATCH_DB,
        `SELECT has_table_privilege($1, 'api.v_existing', 'SELECT') AS api_sel,
                has_table_privilege($1, 'data.t_read', 'SELECT') AS data_sel,
                has_schema_privilege($1, 'data', 'USAGE') AS data_usage`, [PUBLIC]);
      assert.isTrue(priv.rows[0].api_sel, 'api access re-applied');
      assert.isFalse(priv.rows[0].data_sel, 'previous table grants are not restored');
      assert.isFalse(priv.rows[0].data_usage, 'previous schema grants are not restored');

      await publicUser.disable(ctx);
      assert.isFalse(await roleExists(PUBLIC));
    });

  });

  // ── reconcile ─────────────────────────────────────────────────────────────────

  describe('reconcile', function () {

    afterEach(async function () {
      await query(`DELETE FROM pgfarm.instance_user WHERE type = 'PUBLIC'`);
      await dropRoleEverywhere(PUBLIC);
    });

    it('drops a stray role when disabled (e.g. restored from an old backup)', async function () {
      await dbQuery('postgres', `CREATE ROLE "${PUBLIC}" LOGIN PASSWORD '${PUBLIC_PASSWORD}'`);
      await dbQuery(SCRATCH_DB, `GRANT USAGE ON SCHEMA data TO "${PUBLIC}"; GRANT SELECT ON data.t_read TO "${PUBLIC}"`);

      const action = await publicUser.reconcile(ctx);
      assert.equal(action, 'dropped');
      assert.isFalse(await roleExists(PUBLIC));
    });

    it('creates the role and api grants when enabled but missing', async function () {
      await createInstanceUser(ORG, INST, { username: PUBLIC, type: 'PUBLIC', password: PUBLIC_PASSWORD });

      const action = await publicUser.reconcile(ctx);
      assert.equal(action, 'created');
      assert.isTrue(await roleExists(PUBLIC));
      const priv = await dbQuery(SCRATCH_DB,
        `SELECT has_table_privilege($1, 'api.v_existing', 'SELECT') AS sel`, [PUBLIC]);
      assert.isTrue(priv.rows[0].sel);
    });

    it('does nothing when state already matches', async function () {
      assert.equal(await publicUser.reconcile(ctx), 'none');
    });

  });

});
