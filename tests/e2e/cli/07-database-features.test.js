import { assert } from 'chai';
import pg from 'pg';
import { pgfarm } from '../../helpers/cli.js';
import { apiGet } from '../../helpers/e2e-api.js';
import { waitForPodReady, portForward } from '../../helpers/k8s.js';

const TEST_ORG  = 'e2e-org';
const TEST_INST = 'e2e-inst';
const TEST_DB   = 'e2e-db';
const DB_PATH   = `${TEST_ORG}/${TEST_DB}`;
const INST_PATH = `${TEST_ORG}/${TEST_INST}`;
const HOSTNAME  = `inst-${TEST_ORG}-${TEST_INST}`;

const PG_LOCAL_PORT = 15442;
const TEST_TABLE    = 'e2e_exposed_table';

/**
 * Database feature tests: restart-api, update-api-cache, expose-table, init.
 *
 * Requires the e2e-org, e2e-inst, and e2e-db to exist from prior test files.
 * The expose-table test uses kubectl port-forward to create a postgres table
 * before exposing it via the CLI.
 */
describe('database features', function () {

  let pf = null;

  // ── Setup ─────────────────────────────────────────────────────────────────

  before(async function () {
    this.timeout(180000);

    const inst = await apiGet(`/api/instance/${INST_PATH}`, { allowNotFound: true });
    if (!inst) {
      throw new Error(`Instance ${INST_PATH} not found — run 03-instance tests first`);
    }
    if (inst.state !== 'RUN') {
      await pgfarm(['instance', 'start', INST_PATH], { timeout: 30000 });
      await waitForPodReady(HOSTNAME, { timeoutMs: 120000 });
    }

    // Open a port-forward for postgres access used in expose-table test
    pf = await portForward(`${HOSTNAME}-0`, PG_LOCAL_PORT, 5432, { readyTimeoutMs: 15000 });
  });

  after(async function () {
    if (pf) { try { pf.close(); } catch (_) {} pf = null; }

    // Stop instance to free cluster resources after the full suite
    try {
      const data = await apiGet(`/api/instance/${INST_PATH}`, { allowNotFound: true });
      if (data && data.state === 'RUN') {
        await pgfarm(['instance', 'stop', INST_PATH], { timeout: 30000, allowFailure: true });
      }
    } catch (err) {
      console.warn(`  Warning: final cleanup stop failed: ${err.message}`);
    }
  });

  // ── restart-api ───────────────────────────────────────────────────────────

  describe('restart-api', function () {

    it('completes without error', async function () {
      this.timeout(30000);
      const { exitCode } = await pgfarm(['database', 'restart-api', DB_PATH], { timeout: 30000 });
      assert.equal(exitCode, 0);
    });

  });

  // ── update-api-cache ──────────────────────────────────────────────────────

  describe('update-api-cache', function () {

    it('completes without error', async function () {
      this.timeout(30000);
      const { exitCode } = await pgfarm(['database', 'update-api-cache', DB_PATH], { timeout: 30000 });
      assert.equal(exitCode, 0);
    });

  });

  // ── expose-table ──────────────────────────────────────────────────────────

  describe('expose-table', function () {

    before(async function () {
      this.timeout(15000);

      // Create the test table in the e2e-db database via port-forward.
      // The postgres instance uses trust auth internally — credentials are
      // validated at the pgfarm gateway layer, not at the postgres level.
      const client = new pg.Client({
        host: 'localhost',
        port: PG_LOCAL_PORT,
        user: 'postgres',
        password: 'postgres',
        database: TEST_DB,
        connectionTimeoutMillis: 8000,
      });

      try {
        await client.connect();
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${TEST_TABLE} (
            id   SERIAL PRIMARY KEY,
            data TEXT
          )
        `);
      } finally {
        await client.end().catch(() => {});
      }
    });

    it('exposes the table to the PostgREST API without error', async function () {
      this.timeout(30000);
      const { exitCode } = await pgfarm(
        ['database', 'expose-table', DB_PATH, `public.${TEST_TABLE}`],
        { timeout: 30000 }
      );
      assert.equal(exitCode, 0);
    });

  });

  // ── init ──────────────────────────────────────────────────────────────────

  describe('init', function () {

    it('re-runs pgfarm init scripts without error', async function () {
      this.timeout(30000);
      const { exitCode } = await pgfarm(['database', 'init', DB_PATH], { timeout: 30000 });
      assert.equal(exitCode, 0);
    });

  });

});
