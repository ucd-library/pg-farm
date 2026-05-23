import { assert } from 'chai';
import { pgfarm, pgfarmJson } from '../../helpers/cli.js';
import { apiGet } from '../../helpers/e2e-api.js';
import { waitForPodReady, statefulSetExists } from '../../helpers/k8s.js';

const TEST_ORG    = 'e2e-org';
const TEST_INST   = 'e2e-inst';
const INST_PATH   = `${TEST_ORG}/${TEST_INST}`;
const HOSTNAME    = `inst-${TEST_ORG}-${TEST_INST}`;

// A second instance used only to verify the admin sleep cron.
// Created with LOW availability so the sleep cron will target it.
// Only used when PGFARM_E2E_TEST_ADMIN_SLEEP=true.
const SLEEP_INST      = 'e2e-sleep-inst';
const SLEEP_INST_PATH = `${TEST_ORG}/${SLEEP_INST}`;
const SLEEP_HOSTNAME  = `inst-${TEST_ORG}-${SLEEP_INST}`;

const TEST_ADMIN_SLEEP = process.env.PGFARM_E2E_TEST_ADMIN_SLEEP === 'true';

/**
 * Sleep / wake lifecycle tests.
 *
 * Covers explicit stop→start via the CLI and verifies k8s resources are
 * removed on stop and re-created on wake.
 *
 * The admin sleep cron test is opt-in (set PGFARM_E2E_TEST_ADMIN_SLEEP=true)
 * because it calls POST /api/instance/sleep which affects all eligible
 * instances on the cluster, not just the test instance.
 */
describe('sleep / wake', function () {

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
  });

  // ── Explicit stop (sleep) ─────────────────────────────────────────────────

  describe('stop (sleep)', function () {

    before(async function () {
      this.timeout(30000);
      await pgfarm(['instance', 'stop', INST_PATH], { timeout: 30000 });
    });

    it('API reports state SLEEP', async function () {
      const data = await apiGet(`/api/instance/${INST_PATH}`);
      assert.equal(data.state, 'SLEEP');
    });

    it('StatefulSet removed from k8s', async function () {
      this.timeout(60000);
      const deadline = Date.now() + 45000;
      let gone = false;
      while (Date.now() < deadline) {
        if (!await statefulSetExists(HOSTNAME)) { gone = true; break; }
        await new Promise(r => setTimeout(r, 3000));
      }
      assert.isTrue(gone, `StatefulSet ${HOSTNAME} should be gone after stop`);
    });

  });

  // ── Explicit start (wake) ─────────────────────────────────────────────────

  describe('start (wake from sleep)', function () {

    before(async function () {
      this.timeout(30000);
      await pgfarm(['instance', 'start', INST_PATH], { timeout: 30000 });
    });

    it('API reports state RUN', async function () {
      const data = await apiGet(`/api/instance/${INST_PATH}`);
      assert.equal(data.state, 'RUN');
    });

    it('StatefulSet re-created in k8s', async function () {
      assert.isTrue(await statefulSetExists(HOSTNAME));
    });

    it('pod reaches Ready state', async function () {
      this.timeout(150000);
      const pod = await waitForPodReady(HOSTNAME, { timeoutMs: 120000 });
      const ready = pod.status?.conditions?.find(c => c.type === 'Ready' && c.status === 'True');
      assert.ok(ready, 'pod should be Ready after wake');
    });

  });

  // ── Admin sleep cron ──────────────────────────────────────────────────────
  // Opt-in: PGFARM_E2E_TEST_ADMIN_SLEEP=true
  // Creates a LOW-availability instance, starts it, runs the cron, and
  // verifies it transitions to SLEEP with StatefulSet removed.

  (TEST_ADMIN_SLEEP ? describe : describe.skip)('admin sleep cron', function () {

    before(async function () {
      this.timeout(180000);

      // Create the sleep-test instance if it doesn't exist
      const existing = await apiGet(`/api/instance/${SLEEP_INST_PATH}`, { allowNotFound: true });
      if (!existing) {
        await pgfarm([
          'instance', 'create',
          '--name', SLEEP_INST,
          '--organization', TEST_ORG,
          '--availability', 'LOW',
        ]);
      }

      // Start it so the cron has something to sleep
      const inst = await apiGet(`/api/instance/${SLEEP_INST_PATH}`);
      if (inst.state !== 'RUN') {
        await pgfarm(['instance', 'start', SLEEP_INST_PATH], { timeout: 30000 });
        await waitForPodReady(SLEEP_HOSTNAME, { timeoutMs: 120000 });
      }
    });

    it('admin sleep cron transitions LOW-availability instance to SLEEP', async function () {
      this.timeout(120000);

      await pgfarm(['admin', 'sleep'], { timeout: 60000 });

      // Poll for up to 60 s for the instance to transition
      const deadline = Date.now() + 60000;
      let state = '';
      while (Date.now() < deadline) {
        const data = await apiGet(`/api/instance/${SLEEP_INST_PATH}`);
        state = data.state;
        if (state === 'SLEEP') break;
        await new Promise(r => setTimeout(r, 4000));
      }
      assert.equal(state, 'SLEEP', 'expected LOW-availability instance to be slept by cron');
    });

    it('StatefulSet removed after admin sleep', async function () {
      this.timeout(60000);
      const deadline = Date.now() + 45000;
      let gone = false;
      while (Date.now() < deadline) {
        if (!await statefulSetExists(SLEEP_HOSTNAME)) { gone = true; break; }
        await new Promise(r => setTimeout(r, 3000));
      }
      assert.isTrue(gone, `StatefulSet ${SLEEP_HOSTNAME} should be gone after admin sleep`);
    });

    after(async function () {
      this.timeout(30000);
      // Leave the sleep instance in SLEEP state — no delete command available
    });

  });

  // ── Cleanup ───────────────────────────────────────────────────────────────

  after(async function () {
    this.timeout(30000);
    // Leave instance running for 07-database-features
  });

});
