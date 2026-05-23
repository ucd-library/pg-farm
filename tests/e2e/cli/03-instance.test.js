import { assert } from 'chai';
import { pgfarm, pgfarmJson } from '../../helpers/cli.js';
import { apiGet } from '../../helpers/e2e-api.js';
import { waitForPodReady, statefulSetExists } from '../../helpers/k8s.js';
import { resetE2EData } from '../../helpers/db.js';

const TEST_ORG  = 'e2e-org';
const TEST_ORG_TITLE = 'E2E Test Organization';
const TEST_INST = 'e2e-inst';
const INST_PATH = `${TEST_ORG}/${TEST_INST}`;

// StatefulSet name: inst-{org}-{name}
const HOSTNAME = `inst-${TEST_ORG}-${TEST_INST}`;
// DB-stored name includes the inst- prefix
const INST_FULL_NAME = `inst-${TEST_INST}`;

/**
 * Instance lifecycle tests driven entirely through the pgfarm CLI.
 *
 * State-changing operations: CLI
 * API assertions:            apiGet() (authenticated fetch)
 * K8s assertions:            kubectl via k8s helpers
 *
 * resetE2EData() in before() ensures a clean slate so tests are not
 * affected by state left from a prior run.
 */
describe('instance', function () {

  // ── Setup ─────────────────────────────────────────────────────────────────

  before(async function () {
    this.timeout(60000);
    await resetE2EData();

    // Ensure org exists
    await pgfarm([
      'organization', 'create',
      '--title', TEST_ORG_TITLE,
      '--name', TEST_ORG,
    ]);

    await pgfarm([
      'instance', 'create',
      '--name', TEST_INST,
      '--organization', TEST_ORG,
    ]);
  });

  // ── create ────────────────────────────────────────────────────────────────

  describe('create', function () {

    it('instance exists in the API after create', async function () {
      const data = await apiGet(`/api/instance/${INST_PATH}`);
      assert.ok(data.instance_id, 'expected instance_id');
      assert.equal(data.name, INST_FULL_NAME);
    });

    it('instance has expected hostname', async function () {
      const data = await apiGet(`/api/instance/${INST_PATH}`);
      assert.equal(data.hostname, HOSTNAME);
    });

  });

  // ── start ─────────────────────────────────────────────────────────────────

  describe('start', function () {

    before(async function () {
      this.timeout(60000);
      const data = await apiGet(`/api/instance/${INST_PATH}`);
      if (data.state !== 'RUN') {
        await pgfarm(['instance', 'start', INST_PATH], { timeout: 60000 });
      }
    });

    it('API reports state RUN', async function () {
      const data = await apiGet(`/api/instance/${INST_PATH}`);
      assert.equal(data.state, 'RUN');
    });

    it('StatefulSet exists in k8s', async function () {
      assert.isTrue(await statefulSetExists(HOSTNAME));
    });

    it('pod reaches Ready state', async function () {
      this.timeout(150000);
      const pod = await waitForPodReady(HOSTNAME, { timeoutMs: 120000 });
      const ready = pod.status?.conditions?.find(c => c.type === 'Ready' && c.status === 'True');
      assert.ok(ready, 'pod Ready condition should be True');
    });

  });

  // ── get / list ────────────────────────────────────────────────────────────

  describe('get', function () {

    it('returns instance details via CLI', async function () {
      const data = await pgfarmJson(['instance', 'get', INST_PATH]);
      assert.ok(data, 'expected a response object');
      assert.equal(data.name, INST_FULL_NAME);
    });

    it('instance has state field', async function () {
      const data = await apiGet(`/api/instance/${INST_PATH}`);
      assert.ok(data.state, 'expected state field');
    });

  });

  describe('list', function () {

    it('test instance appears in list filtered by org', async function () {
      const data = await pgfarmJson(['instance', 'list', '--organization', TEST_ORG]);
      const items = Array.isArray(data) ? data : (data.items || data);
      const found = items.some(i => i.name === INST_FULL_NAME);
      assert.isTrue(found, `${INST_FULL_NAME} not found in instance list for ${TEST_ORG}`);
    });

  });

  // ── stop ──────────────────────────────────────────────────────────────────

  describe('stop', function () {

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
      assert.isTrue(gone, `StatefulSet ${HOSTNAME} still exists after stop`);
    });

  });

  // ── restart ───────────────────────────────────────────────────────────────

  describe('restart', function () {

    before(async function () {
      this.timeout(60000);
      await pgfarm(['instance', 'start', INST_PATH], { timeout: 60000 });
    });

    it('restart completes and API reports state RUN', async function () {
      this.timeout(60000);
      await pgfarm(['instance', 'restart', INST_PATH], { timeout: 30000 });
      const data = await apiGet(`/api/instance/${INST_PATH}`);
      assert.equal(data.state, 'RUN');
    });

    it('pod reaches Ready state after restart', async function () {
      this.timeout(150000);
      const pod = await waitForPodReady(HOSTNAME, { timeoutMs: 120000 });
      const ready = pod.status?.conditions?.find(c => c.type === 'Ready' && c.status === 'True');
      assert.ok(ready, 'pod should be Ready after restart');
    });

  });

  // ── Cleanup ───────────────────────────────────────────────────────────────

  after(async function () {
    this.timeout(30000);
    try {
      const data = await apiGet(`/api/instance/${INST_PATH}`, { allowNotFound: true });
      if (data && data.instance_id && data.state === 'RUN') {
        await pgfarm(['instance', 'stop', INST_PATH], { timeout: 30000, allowFailure: true });
      }
    } catch (err) {
      console.warn(`  Warning: cleanup stop failed: ${err.message}`);
    }
  });

});
