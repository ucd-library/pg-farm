import { assert } from 'chai';
import { pgfarm, pgfarmJson } from '../../helpers/cli.js';
import { apiGet } from '../../helpers/e2e-api.js';
import { waitForPodReady, statefulSetExists } from '../../helpers/k8s.js';

const TEST_ORG  = 'e2e-org';
const TEST_INST = 'e2e-inst';
const TEST_DB   = 'e2e-db';
const DB_PATH   = `${TEST_ORG}/${TEST_DB}`;
const INST_PATH = `${TEST_ORG}/${TEST_INST}`;
const HOSTNAME  = `inst-${TEST_ORG}-${TEST_INST}`;

/**
 * Database CLI tests.
 *
 * Requires the e2e-org and e2e-inst resources to exist (created by 02/03 tests
 * or a prior run).  Starts the instance if it is sleeping so database
 * operations can succeed.
 */
describe('database', function () {

  // ── Setup ─────────────────────────────────────────────────────────────────

  before(async function () {
    this.timeout(180000);

    // Ensure instance is running
    const inst = await apiGet(`/api/instance/${INST_PATH}`, { allowNotFound: true });
    if (!inst) {
      throw new Error(`Instance ${INST_PATH} not found — run 03-instance tests first`);
    }
    if (inst.state !== 'RUN') {
      await pgfarm(['instance', 'start', INST_PATH], { timeout: 30000 });
      await waitForPodReady(HOSTNAME, { timeoutMs: 120000 });
    }

    // Idempotent: create database only if it does not already exist
    const existing = await apiGet(`/api/db/${DB_PATH}`, { allowNotFound: true });
    if (!existing) {
      await pgfarm([
        'database', 'create',
        '--database', TEST_DB,
        '--organization', TEST_ORG,
        '--instance', TEST_INST,
      ]);
    }
  });

  // ── get ───────────────────────────────────────────────────────────────────

  describe('get', function () {

    it('returns database via CLI', async function () {
      const data = await pgfarmJson(['database', 'get', DB_PATH]);
      assert.ok(data, 'expected a response object');
      const name = data.name || data.database?.name;
      assert.equal(name, TEST_DB);
    });

    it('returns database via API', async function () {
      const data = await apiGet(`/api/db/${DB_PATH}`);
      const name = data.name || data.database?.name;
      assert.equal(name, TEST_DB);
    });

  });

  // ── update ────────────────────────────────────────────────────────────────

  describe('update', function () {

    it('updates title and reflects in API', async function () {
      this.timeout(15000);
      const newTitle = 'E2E Test Database';

      await pgfarm([
        'database', 'update', DB_PATH,
        '--title', newTitle,
      ]);

      const data = await apiGet(`/api/db/${DB_PATH}`);
      const title = data.title;
      assert.equal(title, newTitle);
    });

    it('updates tags and reflects in API', async function () {
      this.timeout(15000);

      await pgfarm([
        'database', 'update', DB_PATH,
        '--tags', 'e2e,test',
      ]);

      const data = await apiGet(`/api/db/${DB_PATH}`);
      const tags = data.tags || data.database?.tags || [];
      assert.include(tags, 'e2e');
      assert.include(tags, 'test');
    });

  });

  // ── search ────────────────────────────────────────────────────────────────

  describe('search', function () {

    it('finds the test database by name text', async function () {
      this.timeout(15000);
      const data = await pgfarmJson([
        'database', 'search',
        '--text', TEST_DB,
        '--organization', TEST_ORG,
      ]);

      const items = data.items || data;
      const found = (Array.isArray(items) ? items : []).some(
        d => (d.name || d.database?.name) === TEST_DB
      );
      assert.isTrue(found, `${TEST_DB} not found in search results`);
    });

    it('finds the test database by tag', async function () {
      this.timeout(15000);
      const data = await pgfarmJson([
        'database', 'search',
        '--tags', 'e2e',
        '--organization', TEST_ORG,
      ]);

      const items = data.items || data;
      const found = (Array.isArray(items) ? items : []).some(
        d => (d.name || d.database?.name) === TEST_DB
      );
      assert.isTrue(found, `${TEST_DB} not found in tag search results`);
    });

  });

  // ── Cleanup ───────────────────────────────────────────────────────────────

  after(async function () {
    this.timeout(30000);
    // Leave instance running for subsequent test files (05-users, 06-sleep-wake)
    // No database delete command yet — database record remains
  });

});
