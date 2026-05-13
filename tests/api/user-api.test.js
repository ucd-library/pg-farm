import { assert } from 'chai';
import { reset } from '../helpers/db.js';
import { createOrg, createInstance, createDatabase, createInstanceUser } from '../helpers/fixtures.js';
import { users } from '../helpers/auth.js';
import { request } from '../helpers/app.js';

describe('user API', function () {

  before(async function () {
    await reset();
    await createOrg({ name: 'api-user-org', title: 'API User Org' });
    await createInstance('api-user-org', { name: 'api-user-inst', state: 'RUN' });
    await createDatabase('api-user-org', 'api-user-inst', { name: 'api-user-db' });
    // ensure test-admin exists in pgfarm.user and is an instance user
    await createInstanceUser('api-user-org', 'api-user-inst', {
      username: users.admin.username,
      type: 'ADMIN',
    });
  });

  after(async function () {
    await reset();
  });

  // ── GET /me ───────────────────────────────────────────────────────────────────

  describe('GET /me', function () {

    it('returns 403 for anonymous user', async function () {
      const res = await request(null).get('/api/user/me');
      assert.equal(res.status, 403);
    });

    it('returns 200 with user profile for logged-in user', async function () {
      const res = await request(users.admin).get('/api/user/me');
      assert.equal(res.status, 200);
      assert.equal(res.body.username, users.admin.username);
      assert.isString(res.body.userId);
    });

    it('response does not include password', async function () {
      const res = await request(users.admin).get('/api/user/me');
      assert.notProperty(res.body, 'password');
    });

  });

  // ── GET /me/db ────────────────────────────────────────────────────────────────

  describe('GET /me/db', function () {

    it('returns 403 for anonymous user', async function () {
      const res = await request(null).get('/api/user/me/db');
      assert.equal(res.status, 403);
    });

    it('returns 200 with array of databases for logged-in user', async function () {
      const res = await request(users.admin).get('/api/user/me/db');
      assert.equal(res.status, 200);
      assert.isArray(res.body);
    });

    it('each db entry has expected shape', async function () {
      const res = await request(users.admin).get('/api/user/me/db');
      if (res.body.length === 0) return;
      const db = res.body[0];
      assert.ok('databaseId' in db, 'databaseId missing');
      assert.ok('databaseName' in db, 'databaseName missing');
      assert.ok('organizationId' in db, 'organizationId missing');
      assert.ok('username' in db, 'username missing');
    });

  });

});
