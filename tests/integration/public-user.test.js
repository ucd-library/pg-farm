import { assert } from 'chai';
import sinon from 'sinon';
import { reset, query } from '../helpers/db.js';
import { createOrg, createInstance, createDatabase, createInstanceUser } from '../helpers/fixtures.js';
import { publicUser, user as userModel, instance as instanceModel, pgRest } from '../../services/models/index.js';
import pgAdminClient from '../../services/lib/pg-admin-client.js';
import pgInstClient from '../../services/lib/pg-instance-client.js';
import keycloak from '../../services/lib/keycloak.js';
import config from '../../services/lib/config.js';
import { createContext } from '../../services/lib/context.js';

const ORG = 'pub-test-org';
const INST = 'inst-pub-test';
const INST_SLEEP = 'inst-pub-sleep';
const DB = 'pub-test-db';
const PUBLIC = config.pgInstance.publicRole.username;

/**
 * @function addPublicRow
 * @description add the PUBLIC instance_user row (enables the public user in the admin db)
 *
 * @param {String} instName instance name
 */
async function addPublicRow(instName = INST) {
  await createInstanceUser(ORG, instName, {
    username: PUBLIC,
    type: 'PUBLIC',
    password: config.pgInstance.publicRole.password,
  });
}

/**
 * @function removePublicRow
 * @description remove the PUBLIC instance_user row
 */
async function removePublicRow() {
  await query(`DELETE FROM pgfarm.instance_user WHERE type = 'PUBLIC'`);
}

describe('public user (admin db + model logic)', function () {

  let inst, db;

  before(async function () {
    await reset();
    await createOrg({ name: ORG, title: 'Public User Test Org' });
    inst = await createInstance(ORG, { name: INST, state: 'RUN' });
    await createInstance(ORG, { name: INST_SLEEP, state: 'SLEEP' });
    db = await createDatabase(ORG, INST, { name: DB });
  });

  after(async function () {
    await reset();
  });

  afterEach(async function () {
    sinon.restore();
    await removePublicRow();
  });

  // ── pgAdminClient.isPublicUserEnabled ─────────────────────────────────────────

  describe('pgAdminClient.isPublicUserEnabled', function () {

    it('is false when no PUBLIC instance_user row exists', async function () {
      assert.isFalse(await pgAdminClient.isPublicUserEnabled(inst.instance_id));
    });

    it('is true when a PUBLIC instance_user row exists', async function () {
      await addPublicRow();
      assert.isTrue(await pgAdminClient.isPublicUserEnabled(inst.instance_id));
    });

    it('is scoped to the instance', async function () {
      await addPublicRow(INST_SLEEP);
      assert.isFalse(await pgAdminClient.isPublicUserEnabled(inst.instance_id));
    });

    it('is false when only a non-PUBLIC user exists', async function () {
      await createInstanceUser(ORG, INST, { username: 'pub-test-regular', type: 'USER' });
      assert.isFalse(await pgAdminClient.isPublicUserEnabled(inst.instance_id));
      await query(`DELETE FROM pgfarm.instance_user WHERE user_id = pgfarm.get_user_id('pub-test-regular')`);
    });

  });

  // ── pgAdminClient.getPublicLoginActivity / getPublicUserReport ────────────────

  describe('public login activity and report', function () {

    beforeEach(async function () {
      await addPublicRow();
      const gw = '00000000-0000-0000-0000-000000000001';
      const ins = `INSERT INTO pgfarm.connection
        (session_id, database_id, user_id, ip_address, connection_data, gateway_id, opened_at)
        VALUES ($1, $2, pgfarm.get_user_id($3), '127.0.0.1', '{}'::jsonb, $4, now() - $5::interval)`;
      await query(ins, ['pub-s1', db.database_id, PUBLIC, gw, '1 day']);
      await query(ins, ['pub-s2', db.database_id, PUBLIC, gw, '2 days']);
      await query(ins, ['pub-s3', db.database_id, PUBLIC, gw, '60 days']);
    });

    afterEach(async function () {
      await query(`DELETE FROM pgfarm.connection WHERE session_id LIKE 'pub-s%'`);
    });

    it('returns last login and 30 day count for the public user', async function () {
      const activity = await pgAdminClient.getPublicLoginActivity(inst.instance_id);
      assert.equal(activity.count30d, 2);
      assert.ok(activity.lastLogin, 'lastLogin missing');
      const ageMs = Date.now() - new Date(activity.lastLogin).getTime();
      assert.isBelow(ageMs, 2 * 24 * 60 * 60 * 1000);
    });

    it('returns zero/null for an instance with no logins', async function () {
      const sleepInst = await pgAdminClient.getInstance({ instance: { name: INST_SLEEP }, organization: { name: ORG } });
      const activity = await pgAdminClient.getPublicLoginActivity(sleepInst.instance_id);
      assert.equal(activity.count30d, 0);
      assert.isNull(activity.lastLogin);
    });

    it('report lists every instance with enabled flag and activity', async function () {
      const rows = await pgAdminClient.getPublicUserReport();
      const run = rows.find(r => r.instance_name === INST);
      const sleep = rows.find(r => r.instance_name === INST_SLEEP);
      assert.ok(run && sleep, 'instances missing from report');
      assert.isTrue(run.public_user_enabled);
      assert.isFalse(sleep.public_user_enabled);
      assert.equal(run.count_30d, 2);
      assert.deepEqual(run.databases, [DB]);
      assert.deepEqual(sleep.databases, []);
      assert.equal(run.organization_name, ORG);
    });

  });

  // ── user model reserved name guards ───────────────────────────────────────────

  describe('user model reserved public user guards', function () {

    it('user.create rejects the public username without allowReserved', async function () {
      const ctx = await createContext({ organization: ORG, instance: INST });
      let err;
      try {
        await userModel.create(ctx, PUBLIC);
      } catch (e) { err = e; }
      assert.ok(err, 'expected error');
      assert.include(err.message, 'reserved');
      assert.isFalse(await pgAdminClient.isPublicUserEnabled(inst.instance_id));
    });

    it('user.create rejects the public username passed as an object', async function () {
      const ctx = await createContext({ organization: ORG, instance: INST });
      let err;
      try {
        await userModel.create(ctx, { username: PUBLIC, type: 'USER' });
      } catch (e) { err = e; }
      assert.ok(err, 'expected error');
      assert.include(err.message, 'reserved');
    });

    it('user.delete rejects the public username', async function () {
      await addPublicRow();
      const ctx = await createContext({ organization: ORG, instance: INST });
      let err;
      try {
        await userModel.delete(ctx, PUBLIC);
      } catch (e) { err = e; }
      assert.ok(err, 'expected error');
      assert.include(err.message, 'reserved');
      assert.isTrue(await pgAdminClient.isPublicUserEnabled(inst.instance_id), 'row should not be removed');
    });

  });

  // ── instance.initInstanceDb (default off) ─────────────────────────────────────

  describe('instance.initInstanceDb', function () {

    it('does NOT create the public user when disabled (default off), reconciles instead', async function () {
      const createStub = sinon.stub(userModel, 'create').resolves();
      const reconcileStub = sinon.stub(publicUser, 'reconcile').resolves('none');
      const ctx = await createContext({ organization: ORG, instance: INST });

      await instanceModel.initInstanceDb(ctx);

      const publicCalls = createStub.getCalls().filter(c => {
        const u = c.args[1];
        return (typeof u === 'string' ? u : u?.username) === PUBLIC;
      });
      assert.lengthOf(publicCalls, 0, 'public user should not be created');
      assert.isTrue(createStub.calledWith(sinon.match.any, 'postgres'), 'postgres user should still be ensured');
      assert.isTrue(reconcileStub.calledOnce);
    });

    it('refreshes the public user when enabled', async function () {
      await addPublicRow();
      const createStub = sinon.stub(userModel, 'create').resolves();
      const reconcileStub = sinon.stub(publicUser, 'reconcile').resolves('none');
      const ctx = await createContext({ organization: ORG, instance: INST });

      await instanceModel.initInstanceDb(ctx);

      const publicCall = createStub.getCalls().find(c => c.args[1] === PUBLIC);
      assert.ok(publicCall, 'public user should be refreshed');
      assert.deepEqual(publicCall.args[2], { allowReserved: true });
      assert.isFalse(reconcileStub.called);
    });

    it('does not throw if reconcile fails', async function () {
      sinon.stub(userModel, 'create').resolves();
      sinon.stub(publicUser, 'reconcile').rejects(new Error('boom'));
      const ctx = await createContext({ organization: ORG, instance: INST });
      await instanceModel.initInstanceDb(ctx);
    });

  });

  // ── pgRest.generateConfigFile ─────────────────────────────────────────────────

  describe('pgRest.generateConfigFile', function () {

    beforeEach(function () {
      sinon.stub(userModel, 'get').resolves({ username: 'pgfarm-authenticator', password: 'secret' });
      sinon.stub(keycloak, 'getJWKS').resolves({ keys: [] });
    });

    it('omits db-anon-role when the public user is disabled', async function () {
      const file = await pgRest.generateConfigFile(DB, ORG);
      assert.notMatch(file, /^db-anon-role/m);
      assert.include(file, 'public user is disabled');
      assert.match(file, /^db-schema = "api"/m);
    });

    it('includes db-anon-role when the public user is enabled', async function () {
      await addPublicRow();
      const file = await pgRest.generateConfigFile(DB, ORG);
      assert.match(file, new RegExp(`^db-anon-role = "${PUBLIC}"`, 'm'));
    });

  });

  // ── pgRest.restart with k8s disabled ──────────────────────────────────────────

  describe('pgRest.restart', function () {

    it('does not throw when k8s is disabled', async function () {
      const ctx = await createContext({ organization: ORG, database: DB });
      await pgRest.restart(ctx);
    });

  });

  // ── publicUser state checks / dry runs (no instance connection) ───────────────

  describe('publicUser model guards', function () {

    it('enable throws for a non-RUN instance', async function () {
      const ctx = await createContext({ organization: ORG, instance: INST_SLEEP });
      let err;
      try { await publicUser.enable(ctx); } catch (e) { err = e; }
      assert.ok(err);
      assert.include(err.message, 'RUN state');
    });

    it('disable throws for a non-RUN instance', async function () {
      const ctx = await createContext({ organization: ORG, instance: INST_SLEEP });
      let err;
      try { await publicUser.disable(ctx); } catch (e) { err = e; }
      assert.ok(err);
      assert.include(err.message, 'RUN state');
    });

    it('getPermissionSummary does not connect for a non-running instance', async function () {
      const roleExists = sinon.spy(pgInstClient, 'roleExists');
      const ctx = await createContext({ organization: ORG, instance: INST_SLEEP });
      const summary = await publicUser.getPermissionSummary(ctx);
      assert.isFalse(summary.instanceRunning);
      assert.isFalse(summary.enabled);
      assert.deepEqual(summary.databases, []);
      assert.isFalse(roleExists.called);
    });

    it('enable dry run makes no changes', async function () {
      const createStub = sinon.stub(userModel, 'create').resolves();
      const ctx = await createContext({ organization: ORG, instance: INST });
      const result = await publicUser.enable(ctx, { dryRun: true });
      assert.isTrue(result.dryRun);
      assert.isFalse(result.alreadyEnabled);
      assert.isAtLeast(result.steps.length, 2);
      assert.isTrue(result.steps.some(s => s.includes(DB)));
      assert.isFalse(createStub.called);
      assert.isFalse(await pgAdminClient.isPublicUserEnabled(inst.instance_id));
    });

    it('disable dry run returns the summary and makes no changes', async function () {
      await addPublicRow();
      const summary = { enabled: true, databases: [], counts: { read: 0, write: 0, other: 0 } };
      sinon.stub(publicUser, 'getPermissionSummary').resolves(summary);
      const dropStub = sinon.stub(publicUser, 'dropRole').resolves(true);
      const ctx = await createContext({ organization: ORG, instance: INST });

      const result = await publicUser.disable(ctx, { dryRun: true });
      assert.isTrue(result.dryRun);
      assert.deepEqual(result.summary, summary);
      assert.isAtLeast(result.steps.length, 4);
      assert.isFalse(dropStub.called);
      assert.isTrue(await pgAdminClient.isPublicUserEnabled(inst.instance_id), 'row should still exist');
    });

  });

  // ── publicUser.disable ordering / error handling (instance pg calls stubbed) ──

  describe('publicUser.disable ordering', function () {

    it('deletes the admin row first, then drops the role, and always restarts PostgREST', async function () {
      await addPublicRow();
      sinon.stub(publicUser, 'getPermissionSummary').resolves({ databases: [] });
      const deleteSpy = sinon.spy(pgAdminClient, 'deleteInstanceUser');
      let rowExistedDuringDrop;
      const dropStub = sinon.stub(publicUser, 'dropRole').callsFake(async () => {
        rowExistedDuringDrop = await pgAdminClient.isPublicUserEnabled(inst.instance_id);
        return true;
      });
      const restartStub = sinon.stub(pgRest, 'restart').resolves();
      const ctx = await createContext({ organization: ORG, instance: INST });

      const result = await publicUser.disable(ctx);

      assert.isTrue(deleteSpy.calledBefore(dropStub));
      assert.isFalse(rowExistedDuringDrop, 'admin row should be deleted before the role is dropped');
      assert.isTrue(restartStub.calledOnce, 'PostgREST should be restarted for the one database');
      assert.isFalse(result.enabled);
      assert.deepEqual(result.errors, []);
    });

    it('restarts PostgREST even if dropping the role throws', async function () {
      await addPublicRow();
      sinon.stub(publicUser, 'getPermissionSummary').resolves({ databases: [] });
      sinon.stub(publicUser, 'dropRole').rejects(new Error('connection refused'));
      const restartStub = sinon.stub(pgRest, 'restart').resolves();
      const ctx = await createContext({ organization: ORG, instance: INST });

      let err;
      try { await publicUser.disable(ctx); } catch (e) { err = e; }
      assert.ok(err);
      assert.isTrue(restartStub.calledOnce);
      assert.isFalse(await pgAdminClient.isPublicUserEnabled(inst.instance_id));
    });

    it('throws with the result attached when the role drop fails', async function () {
      await addPublicRow();
      sinon.stub(publicUser, 'getPermissionSummary').resolves({ databases: [] });
      sinon.stub(publicUser, 'dropRole').callsFake(async (ctx, opts) => {
        opts.errors.push({ step: 'drop-role', message: 'role is still referenced' });
        return false;
      });
      sinon.stub(pgRest, 'restart').resolves();
      const ctx = await createContext({ organization: ORG, instance: INST });

      let err;
      try { await publicUser.disable(ctx); } catch (e) { err = e; }
      assert.ok(err);
      assert.include(err.message, 'role is still referenced');
      assert.ok(err.result);
      assert.isFalse(err.result.enabled);
    });

    it('collects PostgREST restart errors without throwing', async function () {
      await addPublicRow();
      sinon.stub(publicUser, 'getPermissionSummary').resolves({ databases: [] });
      sinon.stub(publicUser, 'dropRole').resolves(true);
      sinon.stub(pgRest, 'restart').rejects(new Error('kubectl failed'));
      const ctx = await createContext({ organization: ORG, instance: INST });

      const result = await publicUser.disable(ctx);
      assert.lengthOf(result.errors, 1);
      assert.equal(result.errors[0].step, 'restart-pgrest');
      assert.equal(result.errors[0].database, DB);
    });

    it('is idempotent when already disabled', async function () {
      sinon.stub(publicUser, 'getPermissionSummary').resolves({ enabled: false, databases: [] });
      sinon.stub(publicUser, 'dropRole').resolves(true);
      sinon.stub(pgRest, 'restart').resolves();
      const ctx = await createContext({ organization: ORG, instance: INST });

      const result = await publicUser.disable(ctx);
      assert.isFalse(result.enabled);
      assert.deepEqual(result.errors, []);
    });

  });

});
