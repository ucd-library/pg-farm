import { assert } from 'chai';
import pg from 'pg';
import { reset } from '../helpers/db.js';
import { createOrg } from '../helpers/fixtures.js';
import { waitForPodReady, portForward } from '../helpers/k8s.js';
import { instance as instanceModel } from '../../services/models/index.js';
import { createContext } from '../../services/lib/context.js';

const TEST_ORG  = 'e2e-access-org';
const TEST_INST = 'access-test';
const PG_LOCAL_PORT = 15441;    // distinct from lifecycle.test.js

/**
 * Note: the pg-farm postgres image is configured with trust authentication.
 * Real authentication is handled by the pg-farm gateway layer (JWT).
 * These tests verify postgres-level authorization (GRANT/REVOKE), not authentication.
 *
 * All pg.Client instances use try/finally to guarantee close() even when
 * a query throws — an unclosed client causes "Connection terminated" errors
 * when the port-forward is killed in the after hook.
 */

/**
 * Creates a pg.Client connected to the port-forwarded postgres instance.
 *
 * @param {string} user
 * @param {string} [database]
 * @returns {pg.Client}
 */
function makeClient(user, database = 'postgres') {
  return new pg.Client({
    host: 'localhost',
    port: PG_LOCAL_PORT,
    user,
    password: 'postgres', // trust auth: any password accepted by the instance
    database,
    connectionTimeoutMillis: 5000,
  });
}

describe('E2E access', function () {

  let ctx;
  let inst;
  let pf = null;

  // ── Setup ──────────────────────────────────────────────────────────────────

  before(async function () {
    this.timeout(180000);
    await reset();
    await createOrg({ name: TEST_ORG, title: 'E2E Access Org' });

    ctx = await createContext({ organization: TEST_ORG });
    inst = await instanceModel.create(ctx, { name: TEST_INST });
    await ctx.update({ instance: inst.name, organization: TEST_ORG });

    await instanceModel.start(ctx);
    await waitForPodReady(inst.hostname, { timeoutMs: 120000 });

    pf = await portForward(`${inst.hostname}-0`, PG_LOCAL_PORT, 5432, { readyTimeoutMs: 15000 });
  });

  after(async function () {
    this.timeout(60000);
    if (pf) { try { pf.close(); } catch (_) {} pf = null; }
    if (ctx && ctx.instance) {
      try { await instanceModel.stop(ctx); } catch (_) {}
    }
    await reset();
  });

  // ── User creation ─────────────────────────────────────────────────────────

  describe('user creation', function () {

    it('creates a new postgres user', async function () {
      this.timeout(10000);
      const admin = makeClient('postgres');
      try {
        await admin.connect();
        await admin.query(`DROP USER IF EXISTS e2e_test_user`);
        await admin.query(`CREATE USER e2e_test_user WITH PASSWORD 'e2e_secret'`);
        const res = await admin.query(`SELECT usename FROM pg_user WHERE usename = 'e2e_test_user'`);
        assert.equal(res.rows.length, 1);
        assert.equal(res.rows[0].usename, 'e2e_test_user');
      } finally {
        await admin.end().catch(() => {});
      }
    });

    it('new user can connect (trust auth — credentials checked at gateway level)', async function () {
      this.timeout(10000);
      const client = makeClient('e2e_test_user');
      try {
        await client.connect();
        const res = await client.query('SELECT current_user AS u');
        assert.equal(res.rows[0].u, 'e2e_test_user');
      } finally {
        await client.end().catch(() => {});
      }
    });

  });

  // ── Database-level CONNECT privilege ─────────────────────────────────────

  describe('database CONNECT grant / revoke', function () {

    before(async function () {
      this.timeout(10000);
      const admin = makeClient('postgres');
      try {
        await admin.connect();
        await admin.query('CREATE DATABASE e2e_access_db');
        // Remove the default PUBLIC privilege so we start from a denied state
        await admin.query('REVOKE CONNECT ON DATABASE e2e_access_db FROM PUBLIC');
      } finally {
        await admin.end().catch(() => {});
      }
    });

    after(async function () {
      this.timeout(10000);
      const admin = makeClient('postgres');
      try {
        await admin.connect();
        // Terminate any sessions still connected to the test DB
        await admin.query(`
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = 'e2e_access_db' AND pid <> pg_backend_pid()
        `);
        await admin.query('DROP DATABASE IF EXISTS e2e_access_db');
      } finally {
        await admin.end().catch(() => {});
      }
    });

    it('user cannot connect before explicit GRANT CONNECT', async function () {
      this.timeout(10000);
      const client = makeClient('e2e_test_user', 'e2e_access_db');
      let connected = false;
      try {
        await client.connect();
        connected = true;
      } catch (err) {
        assert.match(err.message, /permission denied|FATAL/i, `unexpected error: ${err.message}`);
      } finally {
        if (connected) await client.end().catch(() => {});
      }
      assert.isFalse(connected, 'expected CONNECT to be denied before GRANT');
    });

    it('user can connect after GRANT CONNECT', async function () {
      this.timeout(10000);
      const admin = makeClient('postgres');
      try {
        await admin.connect();
        await admin.query('GRANT CONNECT ON DATABASE e2e_access_db TO e2e_test_user');
      } finally {
        await admin.end().catch(() => {});
      }

      const client = makeClient('e2e_test_user', 'e2e_access_db');
      try {
        await client.connect();
        const res = await client.query('SELECT current_database() AS db');
        assert.equal(res.rows[0].db, 'e2e_access_db');
      } finally {
        await client.end().catch(() => {});
      }
    });

    it('user cannot connect after REVOKE CONNECT', async function () {
      this.timeout(10000);
      const admin = makeClient('postgres');
      try {
        await admin.connect();
        await admin.query('REVOKE CONNECT ON DATABASE e2e_access_db FROM e2e_test_user');
        await admin.query(`
          SELECT pg_terminate_backend(pid)
          FROM pg_stat_activity
          WHERE datname = 'e2e_access_db' AND usename = 'e2e_test_user'
        `);
      } finally {
        await admin.end().catch(() => {});
      }

      const client = makeClient('e2e_test_user', 'e2e_access_db');
      let connected = false;
      try {
        await client.connect();
        connected = true;
      } catch (err) {
        assert.match(err.message, /permission denied|FATAL/i, `unexpected error: ${err.message}`);
      } finally {
        if (connected) await client.end().catch(() => {});
      }
      assert.isFalse(connected, 'expected CONNECT to be denied after REVOKE');
    });

  });

  // ── Table-level SELECT privilege ─────────────────────────────────────────

  describe('table SELECT grant / revoke', function () {

    before(async function () {
      this.timeout(10000);
      const admin = makeClient('postgres');
      try {
        await admin.connect();
        await admin.query(`
          CREATE TABLE IF NOT EXISTS e2e_grant_table (
            id   SERIAL PRIMARY KEY,
            data TEXT
          )
        `);
        await admin.query(`INSERT INTO e2e_grant_table (data) VALUES ('hello')`);
        // Ensure e2e_test_user has USAGE on the public schema
        await admin.query('GRANT USAGE ON SCHEMA public TO e2e_test_user');
      } finally {
        await admin.end().catch(() => {});
      }
    });

    after(async function () {
      this.timeout(10000);
      const admin = makeClient('postgres');
      try {
        await admin.connect();
        await admin.query('DROP TABLE IF EXISTS e2e_grant_table');
      } finally {
        await admin.end().catch(() => {});
      }
    });

    it('user cannot SELECT before GRANT', async function () {
      this.timeout(10000);
      const client = makeClient('e2e_test_user');
      let denied = false;
      try {
        await client.connect();
        try {
          await client.query('SELECT * FROM e2e_grant_table');
        } catch (queryErr) {
          assert.match(queryErr.message, /permission denied/i);
          denied = true;
        }
      } finally {
        await client.end().catch(() => {});
      }
      assert.isTrue(denied, 'expected SELECT to be denied before GRANT');
    });

    it('user can SELECT after GRANT SELECT', async function () {
      this.timeout(10000);
      const admin = makeClient('postgres');
      try {
        await admin.connect();
        await admin.query('GRANT SELECT ON e2e_grant_table TO e2e_test_user');
      } finally {
        await admin.end().catch(() => {});
      }

      const client = makeClient('e2e_test_user');
      try {
        await client.connect();
        const res = await client.query('SELECT data FROM e2e_grant_table');
        assert.equal(res.rows[0].data, 'hello');
      } finally {
        await client.end().catch(() => {});
      }
    });

    it('user cannot SELECT after REVOKE', async function () {
      this.timeout(10000);
      const admin = makeClient('postgres');
      try {
        await admin.connect();
        await admin.query('REVOKE SELECT ON e2e_grant_table FROM e2e_test_user');
      } finally {
        await admin.end().catch(() => {});
      }

      const client = makeClient('e2e_test_user');
      let denied = false;
      try {
        await client.connect();
        try {
          await client.query('SELECT * FROM e2e_grant_table');
        } catch (queryErr) {
          assert.match(queryErr.message, /permission denied/i);
          denied = true;
        }
      } finally {
        await client.end().catch(() => {});
      }
      assert.isTrue(denied, 'expected SELECT to be denied after REVOKE');
    });

  });

});
