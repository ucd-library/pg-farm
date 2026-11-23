import { assert } from 'chai';
import pg from 'pg';
import { pgfarm, pgfarmJson } from '../../helpers/cli.js';
import { apiGet } from '../../helpers/e2e-api.js';
import { waitForPodReady, portForward } from '../../helpers/k8s.js';

const TEST_ORG  = 'e2e-org';
const TEST_INST = 'e2e-inst';
const TEST_DB   = 'e2e-db';
const DB_PATH   = `${TEST_ORG}/${TEST_DB}`;
const INST_PATH = `${TEST_ORG}/${TEST_INST}`;
const HOSTNAME  = `inst-${TEST_ORG}-${TEST_INST}`;
const PUBLIC    = process.env.PG_INSTANCE_PUBLIC_ROLE || 'pgfarm-public';

const PG_LOCAL_PORT = 15443;
const READ_TABLE    = 'e2e_public_read';
const WRITE_TABLE   = 'e2e_public_write';

/**
 * Public user enable/disable tests.
 *
 * Requires e2e-org, e2e-inst and e2e-db from prior test files.  e2e-inst is recreated by
 * 03-instance, so the public user starts disabled (the default for new instances).
 * Uses a kubectl port-forward to verify role/grant state directly in postgres.
 */
describe('public user', function () {

  let pf = null;

  /**
   * @function instQuery
   * @description run a query directly against the instance as postgres via port-forward
   *
   * @param {String} sql
   * @param {Array} params
   * @param {String} database defaults to the e2e database
   *
   * @returns {Promise<Object>}
   */
  async function instQuery(sql, params = [], database = TEST_DB) {
    const client = new pg.Client({
      host: 'localhost',
      port: PG_LOCAL_PORT,
      user: 'postgres',
      password: 'postgres',
      database,
      connectionTimeoutMillis: 8000,
    });
    try {
      await client.connect();
      return await client.query(sql, params);
    } finally {
      await client.end().catch(() => {});
    }
  }

  /**
   * @function publicRoleExists
   * @returns {Promise<Boolean>}
   */
  async function publicRoleExists() {
    const r = await instQuery('SELECT 1 FROM pg_roles WHERE rolname = $1', [PUBLIC], 'postgres');
    return r.rows.length > 0;
  }

  /**
   * @function anonymousApiStatus
   * @description make an anonymous PostgREST request and return the http status
   *
   * @returns {Promise<Number>}
   */
  async function anonymousApiStatus() {
    const host = (process.env.PGFARM_HOST || '').replace(/\/$/, '');
    const resp = await fetch(`${host}/api/query/${DB_PATH}/`);
    return resp.status;
  }

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

    pf = await portForward(`${HOSTNAME}-0`, PG_LOCAL_PORT, 5432, { readyTimeoutMs: 15000 });

    await instQuery(`
      CREATE TABLE IF NOT EXISTS public.${READ_TABLE} (id SERIAL PRIMARY KEY, data TEXT);
      CREATE TABLE IF NOT EXISTS public.${WRITE_TABLE} (id SERIAL PRIMARY KEY, data TEXT);
    `);
  });

  after(async function () {
    this.timeout(60000);
    // leave the public user disabled (the default)
    await pgfarm(['instance', 'public-user', 'disable', INST_PATH, '--yes'], { timeout: 60000, allowFailure: true });
    if (pf) { try { pf.close(); } catch (_) {} pf = null; }
    try {
      const data = await apiGet(`/api/instance/${INST_PATH}`, { allowNotFound: true });
      if (data && data.state === 'RUN') {
        await pgfarm(['instance', 'stop', INST_PATH], { timeout: 30000, allowFailure: true });
      }
    } catch (err) {
      console.warn(`  Warning: final cleanup stop failed: ${err.message}`);
    }
  });

  // ── default off ───────────────────────────────────────────────────────────

  it('is disabled by default for a new instance', async function () {
    this.timeout(30000);
    const inst = await apiGet(`/api/instance/${INST_PATH}`);
    assert.strictEqual(inst.publicUserEnabled, false,
      'e2e-inst should be freshly created by 03-instance with the public user disabled');

    const db = await apiGet(`/api/db/${DB_PATH}`);
    assert.strictEqual(db.instance.publicUserEnabled, false);

    assert.isFalse(await publicRoleExists());
  });

  it('status prints the disabled state', async function () {
    this.timeout(30000);
    const { stdout, exitCode } = await pgfarm(['instance', 'public-user', 'status', INST_PATH], { timeout: 30000 });
    assert.equal(exitCode, 0);
    assert.include(stdout, 'DISABLED');
  });

  it('anonymous REST API requests are rejected when disabled', async function () {
    this.timeout(30000);
    assert.equal(await anonymousApiStatus(), 401);
  });

  it('rejects invalid actions', async function () {
    const { exitCode } = await pgfarm(['instance', 'public-user', 'bogus', INST_PATH], { allowFailure: true });
    assert.notEqual(exitCode, 0);
  });

  it('refuses to enable without --yes when not interactive', async function () {
    this.timeout(30000);
    const { exitCode, stdout } = await pgfarm(['instance', 'public-user', 'enable', INST_PATH], { timeout: 30000, allowFailure: true });
    assert.notEqual(exitCode, 0);
    assert.include(stdout, 'Cancelled');
    assert.isFalse(await publicRoleExists());
  });

  // ── enable ────────────────────────────────────────────────────────────────

  it('enable --dry-run makes no changes', async function () {
    this.timeout(30000);
    const { exitCode, stdout } = await pgfarm(['instance', 'public-user', 'enable', INST_PATH, '--dry-run'], { timeout: 30000 });
    assert.equal(exitCode, 0);
    assert.include(stdout, 'Dry run, no changes made');
    const inst = await apiGet(`/api/instance/${INST_PATH}`);
    assert.strictEqual(inst.publicUserEnabled, false);
  });

  it('enable --yes creates the public role', async function () {
    this.timeout(120000);
    const { exitCode, stdout } = await pgfarm(['instance', 'public-user', 'enable', INST_PATH, '--yes'], { timeout: 120000 });
    assert.equal(exitCode, 0, stdout);
    assert.include(stdout, 'ENABLED');

    const inst = await apiGet(`/api/instance/${INST_PATH}`);
    assert.strictEqual(inst.publicUserEnabled, true);
    assert.isTrue(await publicRoleExists());
  });

  // ── grants + dry run summary ──────────────────────────────────────────────

  it('disable --dry-run lists READ and WRITE tables and changes nothing', async function () {
    this.timeout(60000);
    let r = await pgfarm(['database', 'set-access', 'schema', DB_PATH, 'public', PUBLIC, 'READ'], { timeout: 30000 });
    assert.equal(r.exitCode, 0, r.stderr);
    r = await pgfarm(['database', 'set-access', 'table', DB_PATH, `public.${WRITE_TABLE}`, PUBLIC, 'WRITE'], { timeout: 30000 });
    assert.equal(r.exitCode, 0, r.stderr);

    const { exitCode, stdout } = await pgfarm(['instance', 'public-user', 'disable', INST_PATH, '--dry-run'], { timeout: 30000 });
    assert.equal(exitCode, 0);
    assert.include(stdout, 'WARNING');
    assert.include(stdout, `public.${WRITE_TABLE}`);
    assert.include(stdout, `public.${READ_TABLE}`);
    assert.match(stdout, /WRITE \(\d+\):[\s\S]*public\.e2e_public_write/);
    assert.include(stdout, 'Dry run, no changes made');

    assert.isTrue(await publicRoleExists(), 'dry run should not drop the role');
  });

  it('disable --dry-run -o json returns the structured summary', async function () {
    this.timeout(30000);
    const result = await pgfarmJson(['instance', 'public-user', 'disable', INST_PATH, '--dry-run']);
    assert.isTrue(result.dryRun);
    const db = result.summary.databases.find(d => d.database === TEST_DB);
    assert.ok(db, 'e2e-db missing from summary');
    const write = db.tables.find(t => t.name === WRITE_TABLE);
    assert.equal(write?.access, 'WRITE');
  });

  // ── disable ───────────────────────────────────────────────────────────────

  it('disable --yes removes the role and its privileges', async function () {
    this.timeout(120000);
    const { exitCode, stdout } = await pgfarm(['instance', 'public-user', 'disable', INST_PATH, '--yes'], { timeout: 120000 });
    assert.equal(exitCode, 0, stdout);
    assert.include(stdout, 'DISABLED');

    assert.isFalse(await publicRoleExists());
    const inst = await apiGet(`/api/instance/${INST_PATH}`);
    assert.strictEqual(inst.publicUserEnabled, false);

    const grants = await instQuery(
      `SELECT count(*)::int AS c FROM information_schema.role_table_grants WHERE grantee = $1`, [PUBLIC]);
    assert.equal(grants.rows[0].c, 0);
  });

  it('a second disable is idempotent', async function () {
    this.timeout(120000);
    const { exitCode } = await pgfarm(['instance', 'public-user', 'disable', INST_PATH, '--yes'], { timeout: 120000 });
    assert.equal(exitCode, 0);
  });

  it('database init does not re-create the public user', async function () {
    this.timeout(60000);
    const { exitCode } = await pgfarm(['database', 'init', DB_PATH], { timeout: 60000 });
    assert.equal(exitCode, 0);
    assert.isFalse(await publicRoleExists());
  });

  it('re-enable creates a fresh role without the previous table grants', async function () {
    this.timeout(120000);
    const { exitCode } = await pgfarm(['instance', 'public-user', 'enable', INST_PATH, '--yes'], { timeout: 120000 });
    assert.equal(exitCode, 0);
    assert.isTrue(await publicRoleExists());

    const r = await instQuery(`SELECT has_table_privilege($1, $2, 'SELECT') AS sel`, [PUBLIC, `public.${READ_TABLE}`]);
    assert.isFalse(r.rows[0].sel, 'previous grants should not be restored');
  });

  it('generic delete-user refuses the public user', async function () {
    this.timeout(30000);
    const { stderr } = await pgfarm(['instance', 'delete-user', INST_PATH, PUBLIC], { timeout: 30000, allowFailure: true });
    assert.include(stderr, 'reserved');
    assert.isTrue(await publicRoleExists(), 'role must still exist');
  });

});
