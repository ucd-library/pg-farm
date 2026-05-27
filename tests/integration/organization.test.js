import { assert } from 'chai';
import { reset } from '../helpers/db.js';
import { createOrg } from '../helpers/fixtures.js';
import organization from '../../services/models/organization.js';

describe('organization model', function () {

  before(async function () {
    await reset();
  });

  after(async function () {
    await reset();
  });

  // ── get ──────────────────────────────────────────────────────────────────────

  describe('get', function () {

    let org;

    before(async function () {
      org = await createOrg({ name: 'test-get-org', title: 'Test Get Org' });
    });

    it('returns org by name', async function () {
      const result = await organization.get({ organization: { name: 'test-get-org' } });
      assert.equal(result.name, 'test-get-org');
      assert.equal(result.title, 'Test Get Org');
    });

    it('returns org by uuid', async function () {
      const result = await organization.get({ organization: { name: org.organization_id } });
      assert.equal(result.name, 'test-get-org');
    });

    it('includes database_count as a number', async function () {
      const result = await organization.get({ organization: { name: 'test-get-org' } });
      assert.isNumber(result.database_count);
      assert.equal(result.database_count, 0);
    });

    it('throws for unknown org', async function () {
      let threw = false;
      try {
        await organization.get({ organization: { name: 'no-such-org' } });
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

  });

  // ── exists ───────────────────────────────────────────────────────────────────

  describe('exists', function () {

    before(async function () {
      await createOrg({ name: 'test-exists-org', title: 'Test Exists Org' });
    });

    it('returns org object when org exists', async function () {
      const result = await organization.exists({ organization: { name: 'test-exists-org' } });
      assert.ok(result);
      assert.equal(result.name, 'test-exists-org');
    });

    it('returns false when org does not exist', async function () {
      const result = await organization.exists({ organization: { name: 'no-such-org' } });
      assert.isFalse(result);
    });

  });

  // ── search ───────────────────────────────────────────────────────────────────

  describe('search', function () {

    before(async function () {
      await createOrg({ name: 'search-org-alpha', title: 'Alpha Search Org' });
      await createOrg({ name: 'search-org-beta', title: 'Beta Search Org' });
    });

    it('returns items array and total', async function () {
      const results = await organization.search({});
      assert.isArray(results.items);
      assert.isNumber(results.total);
      assert.isAtLeast(results.items.length, 2);
    });

    it('returns database_count as a number on each result', async function () {
      const results = await organization.search({});
      for (const item of results.items) {
        assert.isNumber(item.database_count);
      }
    });

    it('results are ordered by title', async function () {
      const results = await organization.search({});
      const titles = results.items.map(i => i.title);
      const sorted = [...titles].sort();
      assert.deepEqual(titles, sorted);
    });

  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', function () {

    let org;

    before(async function () {
      org = await createOrg({ name: 'test-update-org', title: 'Before Update' });
    });

    it('updates title and description', async function () {
      await organization.update({
        organization: {
          organization_id: org.organization_id,
          title: 'After Update',
          description: 'Updated description',
        }
      });
      const result = await organization.get({ organization: { name: 'test-update-org' } });
      assert.equal(result.title, 'After Update');
      assert.equal(result.description, 'Updated description');
    });

    it('throws when organization_id is missing', async function () {
      let threw = false;
      try {
        await organization.update({ organization: { title: 'No ID' } });
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

    it('throws when only non-metadata fields are supplied', async function () {
      // update() silently skips non-METADATA_FIELDS, producing an empty SET clause
      // which causes a SQL error — callers should never pass only non-metadata fields
      let threw = false;
      try {
        await organization.update({
          organization: {
            organization_id: org.organization_id,
            name: 'attempted-rename',
          }
        });
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', function () {

    it('creates an org with name and title', async function () {
      const { createContext } = await import('../../services/lib/context.js');
      const ctx = await createContext({
        organization: { name: 'new-org', title: 'New Org' }
      });
      const result = await organization.create(ctx, );
      assert.equal(result.name, 'new-org');
      assert.equal(result.title, 'New Org');
    });

    it('auto-generates name from title when name omitted', async function () {
      const { createContext } = await import('../../services/lib/context.js');
      const ctx = await createContext({
        organization: { title: 'Auto Name Org' }
      });
      const result = await organization.create(ctx, );
      assert.match(result.name, /auto-name-org/);
    });

    it('throws when org already exists', async function () {
      const { createContext } = await import('../../services/lib/context.js');
      const ctx = await createContext({
        organization: { name: 'new-org', title: 'Duplicate' }
      });
      let threw = false;
      try {
        await organization.create(ctx);
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

  });

});
