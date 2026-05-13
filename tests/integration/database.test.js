import { assert } from 'chai';
import { reset } from '../helpers/db.js';
import { createOrg, createInstance, createDatabase } from '../helpers/fixtures.js';
import database from '../../services/models/database.js';

describe('database model', function () {

  let org, inst, db;

  before(async function () {
    await reset();
    org = await createOrg({ name: 'db-test-org', title: 'Database Test Org' });
    inst = await createInstance('db-test-org', { name: 'db-test-inst' });
    db = await createDatabase('db-test-org', 'db-test-inst', {
      name: 'test-db',
      title: 'Test Database',
    });
  });

  after(async function () {
    await reset();
  });

  // ── get ──────────────────────────────────────────────────────────────────────

  describe('get', function () {

    it('returns database by name', async function () {
      const result = await database.get({
        database: { name: 'test-db' },
        organization: { name: 'db-test-org' }
      });
      assert.equal(result.name, 'test-db');
    });

    it('includes database_id and title fields', async function () {
      const result = await database.get({
        database: { name: 'test-db' },
        organization: { name: 'db-test-org' }
      });
      assert.isString(result.database_id);
      assert.equal(result.title, 'Test Database');
    });

    it('throws for unknown database', async function () {
      let threw = false;
      try {
        await database.get({
          database: { name: 'no-such-db' },
          organization: { name: 'db-test-org' }
        });
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

  });

  // ── exists ───────────────────────────────────────────────────────────────────

  describe('exists', function () {

    it('returns database object when it exists', async function () {
      const result = await database.exists({
        database: { name: 'test-db' },
        organization: { name: 'db-test-org' }
      });
      assert.ok(result);
      assert.equal(result.name, 'test-db');
    });

    it('returns false when database does not exist', async function () {
      const result = await database.exists({
        database: { name: 'no-such-db' },
        organization: { name: 'db-test-org' }
      });
      assert.isFalse(result);
    });

  });

  // ── update (metadata) ─────────────────────────────────────────────────────────

  describe('update (metadata)', function () {

    it('updates title and description', async function () {
      const ctx = {
        database: { database_id: db.database_id, name: db.name },
        organization: { name: 'db-test-org' }
      };
      await database.update(ctx, { title: 'Updated Title', description: 'Updated description' });
      const updated = await database.get(ctx);
      assert.equal(updated.title, 'Updated Title');
      assert.equal(updated.description, 'Updated description');
    });

    it('throws when no metadata fields provided', async function () {
      const ctx = {
        database: { database_id: db.database_id, name: db.name },
        organization: { name: 'db-test-org' }
      };
      let threw = false;
      try {
        await database.update(ctx, {});
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

    it('throws for invalid metadata field', async function () {
      const ctx = {
        database: { database_id: db.database_id, name: db.name },
        organization: { name: 'db-test-org' }
      };
      let threw = false;
      try {
        await database.update(ctx, { database_id: 'evil' });
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

  });

  // ── search ───────────────────────────────────────────────────────────────────

  describe('search', function () {

    before(async function () {
      await createDatabase('db-test-org', 'db-test-inst', {
        name: 'search-db-a',
        title: 'Alpha Search Database',
      });
      await createDatabase('db-test-org', 'db-test-inst', {
        name: 'search-db-b',
        title: 'Beta Search Database',
      });
    });

    it('returns items array and total', async function () {
      const result = await database.search({});
      assert.isArray(result.items);
      assert.isNumber(result.total);
      assert.isAtLeast(result.total, 3);
    });

    it('filters by organization', async function () {
      const result = await database.search({ organization: 'db-test-org' });
      assert.isAtLeast(result.items.length, 3);
      for (const item of result.items) {
        assert.equal(item.organization_name, 'db-test-org');
      }
    });

    it('respects limit', async function () {
      const result = await database.search({ limit: 1 });
      assert.equal(result.items.length, 1);
    });

    it('results are ordered by title by default', async function () {
      const result = await database.search({ organization: 'db-test-org' });
      const titles = result.items.map(i => i.database_title);
      const sorted = [...titles].sort((a, b) => a.localeCompare(b));
      assert.deepEqual(titles, sorted);
    });

  });

  // ── aggregations ─────────────────────────────────────────────────────────────

  describe('aggregations', function () {

    it('returns organization aggregation', async function () {
      const result = await database.aggregations(['organization']);
      assert.isArray(result);
      const orgAgg = result.find(r => r.key === 'organization');
      assert.ok(orgAgg, 'organization aggregation not found');
      assert.isArray(orgAgg.items);
      const dbTestOrg = orgAgg.items.find(i => i.value === 'db-test-org');
      assert.ok(dbTestOrg, 'db-test-org not found in aggregation');
      assert.isAtLeast(dbTestOrg.count, 1);
    });

    it('returns tag aggregation without error', async function () {
      const result = await database.aggregations(['tag']);
      const tagAgg = result.find(r => r.key === 'tag');
      assert.ok(tagAgg, 'tag aggregation not found');
      assert.isArray(tagAgg.items);
    });

    it('returns multiple aggregations at once', async function () {
      const result = await database.aggregations(['organization', 'tag']);
      assert.equal(result.length, 2);
    });

    it('throws when no valid aggregation types requested', async function () {
      let threw = false;
      try {
        await database.aggregations([]);
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

  });

  // ── METADATA_FIELDS ──────────────────────────────────────────────────────────

  describe('METADATA_FIELDS constant', function () {

    it('contains all expected fields', function () {
      const expected = ['title', 'description', 'shortDescription', 'url', 'tags', 'icon', 'brandColor'];
      for (const field of expected) {
        assert.include(database.METADATA_FIELDS, field);
      }
    });

  });

});
