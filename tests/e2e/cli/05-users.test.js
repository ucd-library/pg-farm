import { assert } from 'chai';
import { pgfarm, pgfarmJson } from '../../helpers/cli.js';
import { apiGet } from '../../helpers/e2e-api.js';
import { waitForPodReady } from '../../helpers/k8s.js';

const TEST_ORG   = 'e2e-org';
const TEST_INST  = 'e2e-inst';
const INST_PATH  = `${TEST_ORG}/${TEST_INST}`;
const HOSTNAME   = `inst-${TEST_ORG}-${TEST_INST}`;

// Use a service account username that is safe to create/delete repeatedly
const TEST_USER  = 'e2e-test-user';

/**
 * Instance user management CLI tests.
 *
 * Requires e2e-org and e2e-inst to exist and be in RUN state.
 * Verifies add-user, update-user, sync-users, and delete-user via CLI,
 * with API assertions after each state change.
 */
describe('users', function () {

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

    // Remove test user if left over from a previous run
    await pgfarm(['instance', 'delete-user', INST_PATH, TEST_USER], { allowFailure: true });
  });

  // ── add-user ──────────────────────────────────────────────────────────────

  describe('add-user', function () {

    it('adds a USER-type user to the instance', async function () {
      this.timeout(30000);
      await pgfarm(['instance', 'add-user', INST_PATH, TEST_USER]);

      const inst = await apiGet(`/api/instance/${INST_PATH}`);
      const users = inst.users || inst.instanceUsers || [];
      const found = users.find(u => (u.username || u.name) === TEST_USER);
      assert.ok(found, `${TEST_USER} not found in instance users after add-user`);
    });

  });

  // ── update-user ───────────────────────────────────────────────────────────

  describe('update-user', function () {

    it('promotes user to ADMIN type', async function () {
      this.timeout(30000);
      await pgfarm(['instance', 'update-user', INST_PATH, TEST_USER, '--type', 'ADMIN']);

      const inst = await apiGet(`/api/instance/${INST_PATH}`);
      const users = inst.users || inst.instanceUsers || [];
      const found = users.find(u => (u.username || u.name) === TEST_USER);
      assert.ok(found, `${TEST_USER} not found after update-user`);
      assert.equal(found.type, 'ADMIN', 'expected user type to be ADMIN');
    });

    it('demotes user back to USER type', async function () {
      this.timeout(30000);
      await pgfarm(['instance', 'update-user', INST_PATH, TEST_USER, '--type', 'USER']);

      const inst = await apiGet(`/api/instance/${INST_PATH}`);
      const users = inst.users || inst.instanceUsers || [];
      const found = users.find(u => (u.username || u.name) === TEST_USER);
      assert.equal(found?.type, 'USER', 'expected user type to be USER');
    });

  });

  // ── sync-users ────────────────────────────────────────────────────────────

  describe('sync-users', function () {

    it('completes successfully', async function () {
      this.timeout(60000);
      const { exitCode } = await pgfarm(['instance', 'sync-users', INST_PATH], { timeout: 60000 });
      assert.equal(exitCode, 0);
    });

  });

  // ── delete-user ───────────────────────────────────────────────────────────

  describe('delete-user', function () {

    it('removes the user from the instance', async function () {
      this.timeout(30000);
      await pgfarm(['instance', 'delete-user', INST_PATH, TEST_USER]);

      const inst = await apiGet(`/api/instance/${INST_PATH}`);
      const users = inst.users || inst.instanceUsers || [];
      const found = users.find(u => (u.username || u.name) === TEST_USER);
      assert.notOk(found, `${TEST_USER} should have been removed from instance users`);
    });

  });

});
