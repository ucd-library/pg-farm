import { assert } from 'chai';
import sinon from 'sinon';
import { reset } from '../helpers/db.js';
import { createOrg, createInstance, createInstanceUser } from '../helpers/fixtures.js';
import { users } from '../helpers/auth.js';
import { request } from '../helpers/app.js';
import { admin as adminModel, instance as instanceModel } from '../../services/models/index.js';

describe('instance API', function () {

  let inst, instanceUser, instanceAdmin;

  before(async function () {
    await reset();
    await createOrg({ name: 'api-inst-org', title: 'API Instance Org' });
    // names starting with inst- bypass the auto-prefix in context.getInstanceName()
    inst = await createInstance('api-inst-org', { name: 'inst-api-test', state: 'RUN' });
    instanceUser = await createInstanceUser('api-inst-org', 'inst-api-test', {
      username: 'api-inst-user',
      type: 'USER',
    });
    instanceAdmin = await createInstanceUser('api-inst-org', 'inst-api-test', {
      username: 'api-inst-admin',
      type: 'ADMIN',
    });
  });

  after(async function () {
    await reset();
  });

  // ── GET / ─────────────────────────────────────────────────────────────────────

  describe('GET / (list)', function () {

    it('returns 200 with array of instances (no auth required)', async function () {
      const res = await request(null).get('/api/instance');
      assert.equal(res.status, 200);
      assert.isArray(res.body);
      assert.isAtLeast(res.body.length, 1);
    });

    it('filters by state', async function () {
      const res = await request(null).get('/api/instance?state=RUN');
      assert.equal(res.status, 200);
      for (const i of res.body) {
        assert.equal(i.state, 'RUN');
      }
    });

  });

  // ── GET /:org/:instance ───────────────────────────────────────────────────────

  describe('GET /:org/:instance', function () {

    it('returns 200 with instance data for admin user', async function () {
      const res = await request(users.admin).get('/api/instance/api-inst-org/inst-api-test');
      assert.equal(res.status, 200);
      assert.equal(res.body.name, 'inst-api-test');
      assert.isArray(res.body.databases);
      assert.ok(res.body.organization, 'organization field missing');
    });

    it('returns 403 for anonymous user', async function () {
      const res = await request(null).get('/api/instance/api-inst-org/inst-api-test');
      assert.equal(res.status, 403);
    });

  });

  // ── POST /:org/:instance/stop, /start, /restart ───────────────────────────────
  // instance admins (not just site admins) must be allowed to call these

  for (const action of ['stop', 'start', 'restart']) {
    describe(`POST /:org/:instance/${action}`, function () {

      // start/restart drive real k8s + pg-rest readiness waits that don't run in
      // this test environment, so stub the model call to isolate the auth gate.
      let modelStub;

      beforeEach(function () {
        if (action === 'start') {
          modelStub = sinon.stub(adminModel, 'startInstance').resolves({});
        } else if (action === 'restart') {
          modelStub = sinon.stub(instanceModel, 'restart').resolves({});
        }
      });

      afterEach(function () {
        if (modelStub) modelStub.restore();
      });

      it('returns 200 for site admin', async function () {
        const res = await request(users.admin)
          .post(`/api/instance/api-inst-org/inst-api-test/${action}`);
        assert.equal(res.status, 200);
      });

      it('returns 200 for instance admin (not just site admin)', async function () {
        const res = await request({
          username: instanceAdmin.username,
          preferred_username: instanceAdmin.username,
          roles: [instanceAdmin.username],
        }).post(`/api/instance/api-inst-org/inst-api-test/${action}`);
        assert.equal(res.status, 200);
      });

      it('returns 403 for a regular instance user', async function () {
        const res = await request({
          username: instanceUser.username,
          preferred_username: instanceUser.username,
          roles: [instanceUser.username],
        }).post(`/api/instance/api-inst-org/inst-api-test/${action}`);
        assert.equal(res.status, 403);
      });

      it('returns 403 for anonymous user', async function () {
        const res = await request(null)
          .post(`/api/instance/api-inst-org/inst-api-test/${action}`);
        assert.equal(res.status, 403);
      });

    });
  }

  // ── PATCH /:org/:instance/priority/:priority ──────────────────────────────────

  describe('PATCH /:org/:instance/priority/:priority', function () {

    it('returns 200 and updated priority for admin', async function () {
      const res = await request(users.admin)
        .patch('/api/instance/api-inst-org/inst-api-test/priority/3');
      assert.equal(res.status, 200);
    });

    it('returns 403 for non-admin user', async function () {
      const res = await request(users.user)
        .patch('/api/instance/api-inst-org/inst-api-test/priority/3');
      assert.equal(res.status, 403);
    });

  });

  // ── PATCH /:org/:instance/user/:user ──────────────────────────────────────────

  describe('PATCH /:org/:instance/user/:user (update type)', function () {

    it('returns 200 when admin updates user type', async function () {
      const res = await request(users.admin)
        .patch('/api/instance/api-inst-org/inst-api-test/user/api-inst-user?type=ADMIN');
      assert.equal(res.status, 200);
      assert.isTrue(res.body.success);
    });

    it('returns 403 for non-admin', async function () {
      const res = await request(null)
        .patch('/api/instance/api-inst-org/inst-api-test/user/api-inst-user?type=USER');
      assert.equal(res.status, 403);
    });

    it('returns 500 for invalid type', async function () {
      const res = await request(users.admin)
        .patch('/api/instance/api-inst-org/inst-api-test/user/api-inst-user?type=BADTYPE');
      assert.equal(res.status, 500);
    });

  });

  // ── PUT /:org/:instance/user/:user ─────────────────────────────────────────────

  describe('PUT /:org/:instance/user/:user (create user)', function () {

    it('returns 403 for non-admin (auth fires before isInstanceAlive)', async function () {
      const res = await request(null)
        .put('/api/instance/api-inst-org/inst-api-test/user/new-inst-user');
      assert.equal(res.status, 403);
    });

  });

  // ── DELETE /:org/:instance/user/:user ─────────────────────────────────────────

  describe('DELETE /:org/:instance/user/:user', function () {

    it('returns 403 for non-admin (auth fires before isInstanceAlive)', async function () {
      const res = await request(null)
        .delete('/api/instance/api-inst-org/inst-api-test/user/api-inst-user');
      assert.equal(res.status, 403);
    });

  });

});
