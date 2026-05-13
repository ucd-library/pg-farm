import { assert } from 'chai';
import pg from 'pg';
import { reset } from '../helpers/db.js';
import { createOrg } from '../helpers/fixtures.js';
import { waitForPodReady, statefulSetExists, portForward } from '../helpers/k8s.js';
import { instance as instanceModel } from '../../services/models/index.js';
import { createContext } from '../../services/lib/context.js';

const TEST_ORG  = 'e2e-lifecycle-org';
const TEST_INST = 'e2e-test';   // becomes inst-e2e-test inside the model
const PG_LOCAL_PORT = 15440;    // port used for kubectl port-forward

/**
 * Full lifecycle:
 *   create org → create instance → start (K8s) → connect →
 *   stop → wake (second start)
 *
 * Requires Docker Desktop K8s and the pgfarm-test namespace.
 * Run with: npm run test:e2e
 */
describe('E2E lifecycle', function () {

  let ctx;
  let inst;      // instance record from admin DB
  let pf = null; // active port-forward handle

  // ── Setup ──────────────────────────────────────────────────────────────────

  before(async function () {
    this.timeout(30000);
    await reset();
    await createOrg({ name: TEST_ORG, title: 'E2E Lifecycle Org' });

    // Bootstrap a context with just the org so instance.create() can look it up
    ctx = await createContext({ organization: TEST_ORG });

    // instance.create() inserts the record and sets hostname = inst-e2e-lifecycle-org-e2e-test
    inst = await instanceModel.create(ctx, { name: TEST_INST });

    // Refresh ctx so it carries the fully-populated instance
    await ctx.update({ instance: inst.name, organization: TEST_ORG });
  });

  after(async function () {
    this.timeout(60000);

    // Kill any lingering port-forward
    if (pf) { try { pf.close(); } catch (_) {} pf = null; }

    // Stop the K8s instance (deletes StatefulSet + Service, ignores if missing)
    if (ctx && ctx.instance) {
      try { await instanceModel.stop(ctx); } catch (_) {}
    }

    await reset();
  });

  // ── Start ──────────────────────────────────────────────────────────────────

  describe('start()', function () {

    it('applies the StatefulSet and Service to K8s', async function () {
      this.timeout(30000);
      await instanceModel.start(ctx);
      assert.isTrue(await statefulSetExists(inst.hostname));
    });

    it('pod reaches Ready state within 2 minutes (2/2 containers)', async function () {
      this.timeout(150000);
      const pod = await waitForPodReady(inst.hostname, { timeoutMs: 120000 });
      const ready = pod.status?.conditions?.find(c => c.type === 'Ready' && c.status === 'True');
      assert.ok(ready, 'pod Ready condition should be True');
    });

    it('sets instance state to RUN in the admin DB', async function () {
      await ctx.update({ instance: inst.name, organization: TEST_ORG });
      assert.equal(ctx.instance.state, 'RUN');
    });

  });

  // ── Postgres connection ───────────────────────────────────────────────────

  describe('postgres connection via port-forward', function () {

    before(async function () {
      this.timeout(15000);
      pf = await portForward(`${inst.hostname}-0`, PG_LOCAL_PORT, 5432);
    });

    after(function () {
      if (pf) { pf.close(); pf = null; }
    });

    it('accepts a postgres connection on the forwarded port', async function () {
      this.timeout(15000);
      const client = new pg.Client({
        host     : 'localhost',
        port     : PG_LOCAL_PORT,
        user     : 'postgres',
        password : 'postgres',
        database : 'postgres',
      });
      await client.connect();
      const result = await client.query('SELECT 1 AS val');
      await client.end();
      assert.equal(result.rows[0].val, 1);
    });

    it('can create and drop a database', async function () {
      this.timeout(15000);
      const client = new pg.Client({
        host     : 'localhost',
        port     : PG_LOCAL_PORT,
        user     : 'postgres',
        password : 'postgres',
        database : 'postgres',
      });
      await client.connect();
      await client.query('CREATE DATABASE e2e_lifecycle_db');
      const res = await client.query(`SELECT datname FROM pg_database WHERE datname = 'e2e_lifecycle_db'`);
      assert.equal(res.rows.length, 1);
      await client.query('DROP DATABASE e2e_lifecycle_db');
      await client.end();
    });

  });

  // ── Stop ──────────────────────────────────────────────────────────────────

  describe('stop()', function () {

    it('deletes the StatefulSet and Service from K8s', async function () {
      this.timeout(30000);
      await instanceModel.stop(ctx);
      assert.isFalse(await statefulSetExists(inst.hostname));
    });

    it('sets instance state to SLEEP in the admin DB', async function () {
      await ctx.update({ instance: inst.name, organization: TEST_ORG });
      assert.equal(ctx.instance.state, 'SLEEP');
    });

  });

  // ── Wake (second start) ───────────────────────────────────────────────────

  describe('second start() — wake from sleep', function () {

    it('re-applies the StatefulSet and Service to K8s', async function () {
      this.timeout(30000);
      // Refresh ctx so start() picks up the latest state and priority
      await ctx.update({ instance: inst.name, organization: TEST_ORG });
      await instanceModel.start(ctx);
      assert.isTrue(await statefulSetExists(inst.hostname));
    });

    it('pod reaches Ready state again', async function () {
      this.timeout(150000);
      const pod = await waitForPodReady(inst.hostname, { timeoutMs: 120000 });
      const ready = pod.status?.conditions?.find(c => c.type === 'Ready' && c.status === 'True');
      assert.ok(ready);
    });

    it('instance state is RUN again', async function () {
      await ctx.update({ instance: inst.name, organization: TEST_ORG });
      assert.equal(ctx.instance.state, 'RUN');
    });

  });

});
