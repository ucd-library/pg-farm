import { assert } from 'chai';
import { reset } from '../helpers/db.js';
import { createOrg, createInstance, createDatabase, createInstanceUser } from '../helpers/fixtures.js';
import { users } from '../helpers/auth.js';
import { request } from '../helpers/app.js';

describe('database API', function () {

  let db;

  before(async function () {
    await reset();
    await createOrg({ name: 'api-db-org', title: 'API DB Org' });
    await createInstance('api-db-org', { name: 'api-db-inst', state: 'RUN' });
    db = await createDatabase('api-db-org', 'api-db-inst', {
      name: 'api-test-db',
      title: 'API Test Database',
    });
    // admin as instance user so role checks pass
    await createInstanceUser('api-db-org', 'api-db-inst', {
      username: users.admin.username,
      type: 'ADMIN',
    });
  });

  after(async function () {
    await reset();
  });

  // ── GET /search ───────────────────────────────────────────────────────────────

  describe('GET /search', function () {

    it('returns 200 with items array and total (no auth required)', async function () {
      const res = await request(null).get('/api/db/search');
      assert.equal(res.status, 200);
      assert.isArray(res.body.items);
      assert.isNumber(res.body.total);
    });

    it('each item has expected shape fields', async function () {
      const res = await request(null).get('/api/db/search');
      if (res.body.items.length === 0) return;
      const item = res.body.items[0];
      assert.ok('id' in item, 'id missing');
      assert.ok('name' in item, 'name missing');
      assert.ok('title' in item, 'title missing');
      assert.ok('state' in item, 'state missing');
    });

    it('respects limit parameter', async function () {
      const res = await request(null).get('/api/db/search?limit=1');
      assert.equal(res.status, 200);
      assert.isAtMost(res.body.items.length, 1);
    });

  });

  // ── POST /search ──────────────────────────────────────────────────────────────

  describe('POST /search', function () {

    it('returns 200 with items and total', async function () {
      const res = await request(null).post('/api/db/search').send({});
      assert.equal(res.status, 200);
      assert.isArray(res.body.items);
    });

    it('filters by organization when sent in body', async function () {
      const res = await request(null)
        .post('/api/db/search')
        .send({ organization: 'api-db-org' });
      assert.equal(res.status, 200);
      assert.isAtLeast(res.body.total, 1);
      for (const item of res.body.items) {
        assert.equal(item.organization?.name, 'api-db-org');
      }
    });

  });

  // ── GET /aggregations ─────────────────────────────────────────────────────────

  describe('GET /aggregations', function () {

    it('returns organization aggregation', async function () {
      const res = await request(null).get('/api/db/aggregations?aggs=organization');
      assert.equal(res.status, 200);
      assert.isArray(res.body);
      const orgAgg = res.body.find(a => a.key === 'organization');
      assert.ok(orgAgg, 'organization aggregation missing');
    });

    it('returns tag aggregation', async function () {
      const res = await request(null).get('/api/db/aggregations?aggs=tag');
      assert.equal(res.status, 200);
      const tagAgg = res.body.find(a => a.key === 'tag');
      assert.ok(tagAgg, 'tag aggregation missing');
    });

  });

  // ── GET /:org/:database ───────────────────────────────────────────────────────

  describe('GET /:org/:database', function () {

    it('returns 200 with database object (no auth, useAliveFlag skips live check)', async function () {
      const res = await request(null).get('/api/db/api-db-org/api-test-db');
      assert.equal(res.status, 200);
      assert.equal(res.body.name, 'api-test-db');
      assert.ok(res.body.organization, 'organization field missing');
      assert.ok(res.body.instance, 'instance field missing');
    });

    it('response includes expected shape fields', async function () {
      const res = await request(null).get('/api/db/api-db-org/api-test-db');
      assert.equal(res.body.title, 'API Test Database');
      assert.isString(res.body.id);
    });

  });

  // ── PATCH /:org/:database ─────────────────────────────────────────────────────

  describe('PATCH /:org/:database (update metadata)', function () {

    it('returns 200 when admin updates metadata', async function () {
      const res = await request(users.admin)
        .patch('/api/db/api-db-org/api-test-db')
        .send({ title: 'Updated Title', description: 'Updated desc' });
      assert.equal(res.status, 200);
      assert.isTrue(res.body.success);
    });

    it('returns 403 for anonymous user', async function () {
      const res = await request(null)
        .patch('/api/db/api-db-org/api-test-db')
        .send({ title: 'Should Fail' });
      assert.equal(res.status, 403);
    });

    it('returns 500 for invalid metadata field', async function () {
      const res = await request(users.admin)
        .patch('/api/db/api-db-org/api-test-db')
        .send({ database_id: 'evil' });
      assert.equal(res.status, 500);
    });

  });

  // ── GET /:org/:database/is-admin ──────────────────────────────────────────────

  describe('GET /:org/:database/is-admin', function () {

    it('returns 200 with isAdmin:true for admin user', async function () {
      const res = await request(users.admin).get('/api/db/api-db-org/api-test-db/is-admin');
      assert.equal(res.status, 200);
      assert.isTrue(res.body.isAdmin);
    });

    it('returns 403 for anonymous user', async function () {
      const res = await request(null).get('/api/db/api-db-org/api-test-db/is-admin');
      assert.equal(res.status, 403);
    });

  });

});
