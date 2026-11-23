import { assert } from 'chai';
import sinon from 'sinon';
import { reset, query } from '../helpers/db.js';
import { createOrg, createInstance, createDatabase, createInstanceUser } from '../helpers/fixtures.js';
import { users } from '../helpers/auth.js';
import { request } from '../helpers/app.js';
import { publicUser, admin as adminModel, instance as instanceModel } from '../../services/models/index.js';
import utils from '../../services/lib/utils.js';
import config from '../../services/lib/config.js';

const ORG = 'api-pub-org';
const INST = 'inst-api-pub';
const DB = 'api-pub-db';
const PUBLIC = config.pgInstance.publicRole.username;
const BASE = `/api/instance/${ORG}/${INST}`;

describe('public user API', function () {

  let instanceAdmin, instanceUser;

  /**
   * @function asUser
   * @description build a request user object for an instance user fixture
   *
   * @param {Object} u fixture user
   * @returns {Object}
   */
  function asUser(u) {
    return { username: u.username, preferred_username: u.username, roles: [u.username] };
  }

  before(async function () {
    await reset();
    await createOrg({ name: ORG, title: 'API Public Org' });
    await createInstance(ORG, { name: INST, state: 'RUN' });
    await createDatabase(ORG, INST, { name: DB });
    instanceAdmin = await createInstanceUser(ORG, INST, { username: 'api-pub-admin', type: 'ADMIN' });
    instanceUser = await createInstanceUser(ORG, INST, { username: 'api-pub-user', type: 'USER' });
  });

  after(async function () {
    await reset();
  });

  beforeEach(function () {
    // isInstanceAlive middleware opens a tcp socket to the instance
    sinon.stub(utils, 'isAlive').resolves(true);
  });

  afterEach(async function () {
    sinon.restore();
    await query(`DELETE FROM pgfarm.instance_user WHERE type = 'PUBLIC'`);
  });

  // ── auth gates ────────────────────────────────────────────────────────────────

  describe('auth gates', function () {

    const routes = [
      ['get', ''],
      ['put', ''],
      ['delete', ''],
      ['put', '?dryRun=true'],
      ['delete', '?dryRun=true'],
    ];

    for (const [method, qs] of routes) {
      it(`${method.toUpperCase()} public-user${qs} returns 403 for anonymous`, async function () {
        const res = await request(null)[method](`${BASE}/public-user${qs}`);
        assert.equal(res.status, 403);
      });

      it(`${method.toUpperCase()} public-user${qs} returns 403 for a regular instance user`, async function () {
        const res = await request(asUser(instanceUser))[method](`${BASE}/public-user${qs}`);
        assert.equal(res.status, 403);
      });

      it(`${method.toUpperCase()} public-user${qs} returns 403 for a non-instance user`, async function () {
        const res = await request(users.user)[method](`${BASE}/public-user${qs}`);
        assert.equal(res.status, 403);
      });
    }

  });

  // ── GET ───────────────────────────────────────────────────────────────────────

  describe('GET /:org/:instance/public-user', function () {

    it('returns the summary for an instance admin', async function () {
      const summary = { enabled: false, databases: [], counts: { read: 0, write: 0, other: 0 } };
      const stub = sinon.stub(publicUser, 'getPermissionSummary').resolves(summary);
      const res = await request(asUser(instanceAdmin)).get(`${BASE}/public-user`);
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, summary);
      assert.isTrue(stub.calledOnce);
    });

  });

  // ── PUT / DELETE ──────────────────────────────────────────────────────────────

  describe('PUT/DELETE /:org/:instance/public-user', function () {

    it('PUT passes dryRun=true through', async function () {
      const stub = sinon.stub(publicUser, 'enable').resolves({ dryRun: true, steps: [] });
      const res = await request(asUser(instanceAdmin)).put(`${BASE}/public-user?dryRun=true`);
      assert.equal(res.status, 200);
      assert.deepEqual(stub.firstCall.args[1], { dryRun: true });
    });

    it('PUT without dryRun enables', async function () {
      const stub = sinon.stub(publicUser, 'enable').resolves({ dryRun: false, enabled: true, steps: [], errors: [] });
      const res = await request(users.admin).put(`${BASE}/public-user`);
      assert.equal(res.status, 200);
      assert.isTrue(res.body.enabled);
      assert.deepEqual(stub.firstCall.args[1], { dryRun: false });
    });

    it('DELETE ?dryRun=true returns the summary', async function () {
      const summary = { enabled: true, databases: [{ database: DB, tables: [], counts: { read: 1, write: 0, other: 0 } }] };
      const stub = sinon.stub(publicUser, 'disable').resolves({ dryRun: true, summary, steps: ['a'] });
      const res = await request(asUser(instanceAdmin)).delete(`${BASE}/public-user?dryRun=true`);
      assert.equal(res.status, 200);
      assert.isTrue(res.body.dryRun);
      assert.deepEqual(res.body.summary, summary);
      assert.deepEqual(stub.firstCall.args[1], { dryRun: true });
    });

    it('DELETE dry run against the real model changes nothing', async function () {
      await createInstanceUser(ORG, INST, { username: PUBLIC, type: 'PUBLIC', password: 'x' });
      sinon.stub(publicUser, 'getPermissionSummary').resolves({ enabled: true, databases: [] });
      const res = await request(asUser(instanceAdmin)).delete(`${BASE}/public-user?dryRun=true`);
      assert.equal(res.status, 200);
      assert.isTrue(res.body.dryRun);
      const rows = await query(`SELECT 1 FROM pgfarm.instance_user WHERE type = 'PUBLIC'`);
      assert.lengthOf(rows.rows, 1, 'public row should not be removed by a dry run');
    });

    it('DELETE returns 500 with result details when disable fails', async function () {
      const err = new Error('Failed to drop public role');
      err.result = { errors: [{ step: 'drop-role', message: 'x' }] };
      sinon.stub(publicUser, 'disable').rejects(err);
      const res = await request(asUser(instanceAdmin)).delete(`${BASE}/public-user`);
      assert.equal(res.status, 500);
      assert.include(res.body.message, 'Failed to drop public role');
      assert.deepEqual(res.body.details, err.result);
    });

    it('PUT returns 503 when the instance is not responsive', async function () {
      utils.isAlive.restore();
      sinon.stub(utils, 'isAlive').resolves(false);
      const stub = sinon.stub(publicUser, 'enable').resolves({});
      // pod status lookup uses kubectl, which is not available in tests
      sinon.stub(instanceModel, 'getPodStatus').resolves(null);
      const res = await request(asUser(instanceAdmin)).put(`${BASE}/public-user`);
      assert.equal(res.status, 503);
      assert.isFalse(stub.called);
    });

  });

  // ── publicUserEnabled in GET responses ────────────────────────────────────────

  describe('publicUserEnabled flag', function () {

    it('GET /api/instance/:org/:instance includes publicUserEnabled=false by default', async function () {
      const res = await request(users.admin).get(BASE);
      assert.equal(res.status, 200);
      assert.strictEqual(res.body.publicUserEnabled, false);
    });

    it('GET /api/instance/:org/:instance includes publicUserEnabled=true when enabled', async function () {
      await createInstanceUser(ORG, INST, { username: PUBLIC, type: 'PUBLIC', password: 'x' });
      const res = await request(users.admin).get(BASE);
      assert.strictEqual(res.body.publicUserEnabled, true);
    });

    it('GET /api/db/:org/:db (anonymous) includes instance.publicUserEnabled', async function () {
      let res = await request(null).get(`/api/db/${ORG}/${DB}`);
      assert.equal(res.status, 200);
      assert.strictEqual(res.body.instance.publicUserEnabled, false);

      await createInstanceUser(ORG, INST, { username: PUBLIC, type: 'PUBLIC', password: 'x' });
      res = await request(null).get(`/api/db/${ORG}/${DB}`);
      assert.strictEqual(res.body.instance.publicUserEnabled, true);
    });

  });

  // ── generic user routes reject the reserved public user ───────────────────────

  describe('generic user routes', function () {

    it('PUT /:org/:instance/user/<public> returns 400 and does not create the user', async function () {
      const createStub = sinon.stub(adminModel, 'createUser').resolves();
      const res = await request(users.admin).put(`${BASE}/user/${PUBLIC}`);
      assert.equal(res.status, 400);
      assert.include(res.body.message, 'reserved');
      assert.isFalse(createStub.called);
    });

    it('PUT /:org/:instance/user/<public>?type=USER returns 400', async function () {
      const createStub = sinon.stub(adminModel, 'createUser').resolves();
      const res = await request(users.admin).put(`${BASE}/user/${PUBLIC}?type=USER`);
      assert.equal(res.status, 400);
      assert.isFalse(createStub.called);
    });

    it('DELETE /:org/:instance/user/<public> returns 400 and does not delete the user', async function () {
      await createInstanceUser(ORG, INST, { username: PUBLIC, type: 'PUBLIC', password: 'x' });
      const deleteStub = sinon.stub(adminModel, 'deleteUser').resolves();
      const res = await request(users.admin).delete(`${BASE}/user/${PUBLIC}`);
      assert.equal(res.status, 400);
      assert.include(res.body.message, 'public-user');
      assert.isFalse(deleteStub.called);
    });

  });

  // ── admin report ──────────────────────────────────────────────────────────────

  describe('GET /api/admin/public-user-report', function () {

    it('returns 403 for anonymous', async function () {
      const res = await request(null).get('/api/admin/public-user-report');
      assert.equal(res.status, 403);
    });

    it('returns 403 for an instance admin who is not a site admin', async function () {
      const res = await request(asUser(instanceAdmin)).get('/api/admin/public-user-report');
      assert.equal(res.status, 403);
    });

    it('returns all instances with enabled flag for a site admin', async function () {
      await createInstanceUser(ORG, INST, { username: PUBLIC, type: 'PUBLIC', password: 'x' });
      const res = await request(users.admin).get('/api/admin/public-user-report');
      assert.equal(res.status, 200);
      const row = res.body.find(r => r.instance === INST);
      assert.ok(row, 'instance missing from report');
      assert.isTrue(row.publicUserEnabled);
      assert.equal(row.organization, ORG);
      assert.deepEqual(row.databases, [DB]);
      assert.equal(row.publicLogins30d, 0);
      assert.isUndefined(row.summary, 'summary only included with details=true');
    });

    it('details=true adds a permission summary for running, enabled instances', async function () {
      await createInstanceUser(ORG, INST, { username: PUBLIC, type: 'PUBLIC', password: 'x' });
      const stub = sinon.stub(publicUser, 'getPermissionSummary').resolves({
        counts: { read: 2, write: 1, other: 0 },
        databases: [{ database: DB, counts: { read: 2, write: 1, other: 0 }, tables: [] }],
        errors: []
      });
      const res = await request(users.admin).get('/api/admin/public-user-report?details=true');
      assert.equal(res.status, 200);
      const row = res.body.find(r => r.instance === INST);
      assert.deepEqual(row.summary.counts, { read: 2, write: 1, other: 0 });
      assert.deepEqual(row.summary.databases, [{ database: DB, counts: { read: 2, write: 1, other: 0 } }]);
      assert.isTrue(stub.calledOnce);
    });

  });

});
