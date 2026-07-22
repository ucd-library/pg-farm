import { assert } from 'chai';
import { reset } from '../helpers/db.js';
import { createOrg, createInstance, createInstanceUser } from '../helpers/fixtures.js';
import { users } from '../helpers/auth.js';
import { request } from '../helpers/app.js';

describe('organization API', function () {

  let org;

  before(async function () {
    await reset();
    org = await createOrg({ name: 'api-org-test', title: 'API Org Test' });
    await createInstance('api-org-test', { name: 'api-org-inst' });
    await createInstanceUser('api-org-test', 'api-org-inst', {
      username: users.admin.username,
      type: 'ADMIN',
    });
  });

  after(async function () {
    await reset();
  });

  // ── GET /search ───────────────────────────────────────────────────────────────

  describe('GET /search', function () {

    it('returns 200 with items and total (no auth required)', async function () {
      const res = await request(null).get('/api/organization/search');
      assert.equal(res.status, 200);
      assert.isArray(res.body.items);
      assert.isNumber(res.body.total);
    });

    it('returns at least the seeded org in results', async function () {
      const res = await request(null).get('/api/organization/search');
      assert.isAtLeast(res.body.total, 1);
    });

  });

  // ── POST /search ──────────────────────────────────────────────────────────────

  describe('POST /search', function () {

    it('returns 200 with items and total', async function () {
      const res = await request(null).post('/api/organization/search').send({});
      assert.equal(res.status, 200);
      assert.isArray(res.body.items);
    });

  });

  // ── POST / ────────────────────────────────────────────────────────────────────

  describe('POST / (create org)', function () {

    it('returns 201 and the created org when admin', async function () {
      const res = await request(users.admin)
        .post('/api/organization')
        .send({ name: 'new-api-org', title: 'New API Org' });
      assert.equal(res.status, 201);
      assert.equal(res.body.name, 'new-api-org');
    });

    it('returns 403 when not authenticated', async function () {
      const res = await request(null)
        .post('/api/organization')
        .send({ name: 'should-fail-org', title: 'Should Fail' });
      assert.equal(res.status, 403);
    });

  });

  // ── GET /:org ─────────────────────────────────────────────────────────────────

  describe('GET /:org', function () {

    it('returns 200 with org object', async function () {
      const res = await request(null).get('/api/organization/api-org-test');
      assert.equal(res.status, 200);
      assert.equal(res.body.name, 'api-org-test');
    });

    it('returns 404 with stub object for unknown org (context fallback)', async function () {
      const res = await request(null).get('/api/organization/no-such-org-xyz');
      assert.equal(res.status, 404);
      assert.equal(res.body.error, "Organization 'no-such-org-xyz' not found");
    });

  });

  // ── GET /:org/users ───────────────────────────────────────────────────────────

  describe('GET /:org/users', function () {

    it('returns 200 with array of users for an org admin', async function () {
      const res = await request(users.admin).get('/api/organization/api-org-test/users');
      assert.equal(res.status, 200);
      assert.isArray(res.body);
    });

    it('returns 403 when not authenticated', async function () {
      const res = await request(null).get('/api/organization/api-org-test/users');
      assert.equal(res.status, 403);
    });

  });

  // ── PATCH /:org ───────────────────────────────────────────────────────────────

  describe('PATCH /:org (update)', function () {

    it('returns 200 when admin patches org metadata', async function () {
      const res = await request(users.admin)
        .patch('/api/organization/api-org-test')
        .send({ title: 'Updated API Org', organization_id: org.organization_id });
      assert.equal(res.status, 200);
      assert.isTrue(res.body.success);
    });

    it('returns 403 when not authenticated', async function () {
      const res = await request(null)
        .patch('/api/organization/api-org-test')
        .send({ title: 'Should Fail' });
      assert.equal(res.status, 403);
    });

  });

  // ── GET /:org/is-admin ────────────────────────────────────────────────────────

  describe('GET /:org/is-admin', function () {

    it('returns 200 with isAdmin:true for admin user', async function () {
      const res = await request(users.admin).get('/api/organization/api-org-test/is-admin');
      assert.equal(res.status, 200);
      assert.isTrue(res.body.isAdmin);
    });

    it('returns 403 for anonymous user', async function () {
      const res = await request(null).get('/api/organization/api-org-test/is-admin');
      assert.equal(res.status, 403);
    });

  });

  // ── GET /:org/logo ─────────────────────────────────────────────────────────────

  describe('GET /:org/logo', function () {

    it('returns 404 when no logo is set', async function () {
      const res = await request(null).get('/api/organization/api-org-test/logo');
      assert.equal(res.status, 404);
    });

  });

});
