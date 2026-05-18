import { assert } from 'chai';
import { reset } from '../helpers/db.js';
import { createOrg, createInstance } from '../helpers/fixtures.js';
import { users } from '../helpers/auth.js';
import { request } from '../helpers/app.js';

describe('admin API', function () {

  before(async function () {
    await reset();
    await createOrg({ name: 'api-admin-org', title: 'API Admin Org' });
    await createInstance('api-admin-org', { name: 'api-admin-inst', state: 'RUN' });
  });

  after(async function () {
    await reset();
  });

  // ── auth gate ─────────────────────────────────────────────────────────────────

  describe('auth gate (all admin routes require admin role)', function () {

    it('GET /connections returns 403 for anonymous user', async function () {
      const res = await request(null).get('/api/admin/connections');
      assert.equal(res.status, 403);
    });

    it('GET /connections returns 403 for non-admin user', async function () {
      const res = await request(users.user).get('/api/admin/connections');
      assert.equal(res.status, 403);
    });

  });

  // ── GET /connections ──────────────────────────────────────────────────────────

  describe('GET /connections', function () {

    it('returns 200 with array of connections for admin', async function () {
      const res = await request(users.admin).get('/api/admin/connections');
      assert.equal(res.status, 200);
      assert.isArray(res.body);
    });

    it('accepts username filter', async function () {
      const res = await request(users.admin).get('/api/admin/connections?username=no-such-user');
      assert.equal(res.status, 200);
      assert.isArray(res.body);
    });

  });

  // ── GET /connection-log/:sessionId ────────────────────────────────────────────

  describe('GET /connection-log/:sessionId', function () {

    it('returns 200 with empty array for unknown session', async function () {
      const res = await request(users.admin).get('/api/admin/connection-log/no-such-session');
      assert.equal(res.status, 200);
      assert.isArray(res.body);
      assert.equal(res.body.length, 0);
    });

  });

});
