import { assert } from 'chai';
import { pgfarm, pgfarmJson } from '../../helpers/cli.js';
import { apiGet } from '../../helpers/e2e-api.js';
import { resetE2EData } from '../../helpers/db.js';

const TEST_ORG       = 'e2e-org';
const TEST_ORG_TITLE = 'E2E Test Organization';
const TEST_ORG_DESC  = 'Created by e2e test suite';

/**
 * Organization CLI tests.
 *
 * resetE2EData() in before() ensures a clean slate so tests are not
 * affected by state left from a prior run.
 */
describe('organization', function () {

  // ── Setup ─────────────────────────────────────────────────────────────────

  before(async function () {
    this.timeout(30000);
    await resetE2EData();
    await pgfarm([
      'organization', 'create',
      '--title', TEST_ORG_TITLE,
      '--name', TEST_ORG,
      '--description', TEST_ORG_DESC,
    ]);
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get', function () {

    it('CLI returns a valid org object', async function () {
      const data = await pgfarmJson(['organization', 'get', TEST_ORG]);
      assert.equal(data.name, TEST_ORG);
      assert.equal(data.title, TEST_ORG_TITLE);
      assert.ok(data.organization_id, 'expected organization_id');
    });

    it('API returns all expected fields', async function () {
      const data = await apiGet(`/api/organization/${TEST_ORG}`);
      assert.equal(data.name, TEST_ORG);
      assert.equal(data.title, TEST_ORG_TITLE);
      assert.equal(data.description, TEST_ORG_DESC);
      assert.ok(data.organization_id, 'expected organization_id (confirms row exists in DB)');
      assert.ok(data.created_at, 'expected created_at timestamp');
      assert.ok(data.updated_at, 'expected updated_at timestamp');
      assert.strictEqual(parseInt(data.database_count), 0, 'fresh org should have 0 databases');
    });

  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', function () {

    it('updates description and reflects in API', async function () {
      this.timeout(15000);
      const newDesc = 'Updated description';
      await pgfarm(['organization', 'update', TEST_ORG, '--description', newDesc]);
      const data = await apiGet(`/api/organization/${TEST_ORG}`);
      assert.equal(data.description, newDesc);
    });

    it('updates url and reflects in API', async function () {
      this.timeout(15000);
      const newUrl = 'https://example.com/e2e-org';
      await pgfarm(['organization', 'update', TEST_ORG, '--url', newUrl]);
      const data = await apiGet(`/api/organization/${TEST_ORG}`);
      assert.equal(data.url, newUrl);
    });

    it('updates multiple fields at once', async function () {
      this.timeout(15000);
      const newTitle = 'E2E Test Organization (Updated)';
      const newDesc  = 'Multi-field update';
      await pgfarm([
        'organization', 'update', TEST_ORG,
        '--title', newTitle,
        '--description', newDesc,
      ]);
      const data = await apiGet(`/api/organization/${TEST_ORG}`);
      assert.equal(data.title, newTitle);
      assert.equal(data.description, newDesc);
    });

    it('updated_at advances after an update', async function () {
      this.timeout(15000);
      const before = await apiGet(`/api/organization/${TEST_ORG}`);
      const tBefore = new Date(before.updated_at).getTime();

      // Small delay so the timestamp is guaranteed to differ
      await new Promise(r => setTimeout(r, 1000));

      await pgfarm(['organization', 'update', TEST_ORG, '--description', 'timestamp test']);
      const after = await apiGet(`/api/organization/${TEST_ORG}`);
      const tAfter = new Date(after.updated_at).getTime();

      assert.isAbove(tAfter, tBefore, 'updated_at should advance after an update');
    });

  });

  // ── search ────────────────────────────────────────────────────────────────

  describe('search (API)', function () {

    it('test org appears in search results', async function () {
      const data = await apiGet('/api/organization/search');
      assert.isArray(data.items, 'expected items array');
      assert.isNumber(data.total, 'expected numeric total');
      const found = data.items.find(o => o.name === TEST_ORG);
      assert.ok(found, `${TEST_ORG} not found in search results`);
    });

    it('search result contains expected fields', async function () {
      const data = await apiGet('/api/organization/search');
      const org = data.items.find(o => o.name === TEST_ORG);
      assert.ok(org.organization_id, 'expected organization_id in search result');
      assert.ok(org.title, 'expected title in search result');
      assert.isNumber(org.database_count, 'expected numeric database_count');
    });

  });

  // ── users ─────────────────────────────────────────────────────────────────

  describe('users', function () {

    it('returns an array (empty before any instances are created)', async function () {
      const data = await pgfarmJson(['organization', 'users', TEST_ORG]);
      assert.isArray(data, 'expected users to be an array');
    });

    it('CLI exits 0', async function () {
      const { exitCode } = await pgfarm(['organization', 'users', TEST_ORG]);
      assert.equal(exitCode, 0);
    });

  });

});
