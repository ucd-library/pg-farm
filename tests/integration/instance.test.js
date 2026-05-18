import { assert } from 'chai';
import { reset } from '../helpers/db.js';
import { createOrg, createInstance } from '../helpers/fixtures.js';
import { createContext } from '../../services/lib/context.js';
import instance from '../../services/models/instance.js';
import config from '../../services/lib/config.js';

describe('instance model', function () {

  let org;

  before(async function () {
    await reset();
    org = await createOrg({ name: 'inst-test-org', title: 'Instance Test Org' });
  });

  after(async function () {
    await reset();
  });

  // ── list ─────────────────────────────────────────────────────────────────────

  describe('list', function () {

    before(async function () {
      await createInstance('inst-test-org', { name: 'list-inst-a', state: 'RUN' });
      await createInstance('inst-test-org', { name: 'list-inst-b', state: 'SLEEP' });
    });

    it('returns all instances (default paging)', async function () {
      const results = await instance.list();
      assert.isArray(results);
      assert.isAtLeast(results.length, 2);
    });

    it('filters by state', async function () {
      const results = await instance.list({ state: 'RUN' });
      for (const r of results) {
        assert.equal(r.state, 'RUN');
      }
    });

    it('filters by organization', async function () {
      const results = await instance.list({ organization: 'inst-test-org' });
      assert.isAtLeast(results.length, 2);
      for (const r of results) {
        assert.equal(r.organization_name, 'inst-test-org');
      }
    });

    it('respects limit', async function () {
      const results = await instance.list({ limit: 1 });
      assert.equal(results.length, 1);
    });

  });

  // ── get ──────────────────────────────────────────────────────────────────────

  describe('get', function () {

    let inst;

    before(async function () {
      inst = await createInstance('inst-test-org', { name: 'get-inst' });
    });

    it('returns instance by name', async function () {
      const result = await instance.get({
        instance: { name: inst.name },
        organization: { name: 'inst-test-org' }
      });
      assert.equal(result.name, inst.name);
    });

    it('returns instance by uuid', async function () {
      const result = await instance.get({
        instance: { name: inst.instance_id },
        organization: { name: 'inst-test-org' }
      });
      assert.equal(result.instance_id, inst.instance_id);
    });

    it('throws for unknown instance', async function () {
      let threw = false;
      try {
        await instance.get({
          instance: { name: 'no-such-inst' },
          organization: { name: 'inst-test-org' }
        });
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

  });

  // ── exists ───────────────────────────────────────────────────────────────────

  describe('exists', function () {

    let inst;

    before(async function () {
      inst = await createInstance('inst-test-org', { name: 'exists-inst' });
    });

    it('returns instance object when it exists', async function () {
      const result = await instance.exists({
        instance: { name: inst.name },
        organization: { name: 'inst-test-org' }
      });
      assert.ok(result);
      assert.equal(result.name, inst.name);
    });

    it('returns false when instance does not exist', async function () {
      const result = await instance.exists({
        instance: { name: 'no-such-inst' },
        organization: { name: 'inst-test-org' }
      });
      assert.isFalse(result);
    });

  });

  // ── create ───────────────────────────────────────────────────────────────────

  describe('create', function () {

    it('creates instance and auto-prefixes name with inst-', async function () {
      const ctx = await createContext({});
      const result = await instance.create(ctx, {
        name: 'new-inst',
        organization: 'inst-test-org'
      });
      assert.match(result.name, /^inst-new-inst$/);
    });

    it('sets hostname from org and instance name', async function () {
      const ctx = await createContext({});
      const result = await instance.create(ctx, {
        name: 'hostname-inst',
        organization: 'inst-test-org'
      });
      assert.include(result.hostname, 'inst-test-org');
      assert.include(result.hostname, 'hostname-inst');
    });

    it('throws when instance already exists', async function () {
      const ctx = await createContext({});
      await instance.create(ctx, { name: 'dup-inst', organization: 'inst-test-org' });

      const ctx2 = await createContext({});
      let threw = false;
      try {
        await instance.create(ctx2, { name: 'dup-inst', organization: 'inst-test-org' });
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

  });

  // ── setInstanceState / checkInstanceState ─────────────────────────────────────

  describe('setInstanceState / checkInstanceState', function () {

    let inst;

    before(async function () {
      inst = await createInstance('inst-test-org', { name: 'state-inst', state: 'RUN' });
    });

    it('updates instance state in the DB', async function () {
      const ctx = {
        instance: { name: inst.name },
        organization: { name: 'inst-test-org' }
      };
      await instance.setInstanceState(ctx, 'SLEEP');
      const updated = await instance.get(ctx);
      assert.equal(updated.state, 'SLEEP');
    });

    it('checkInstanceState returns true when state matches', function () {
      const ctx = { instance: { state: 'RUN' } };
      assert.isTrue(instance.checkInstanceState(ctx, 'RUN'));
    });

    it('checkInstanceState returns false when state does not match', function () {
      const ctx = { instance: { state: 'SLEEP' } };
      assert.isFalse(instance.checkInstanceState(ctx, 'RUN'));
    });

    it('checkInstanceState accepts an array of states', function () {
      const ctx = { instance: { state: 'SLEEP' } };
      assert.isTrue(instance.checkInstanceState(ctx, ['RUN', 'SLEEP']));
      assert.isFalse(instance.checkInstanceState(ctx, ['RUN', 'CREATING']));
    });

  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update (property)', function () {

    let inst;

    before(async function () {
      inst = await createInstance('inst-test-org', { name: 'update-prop-inst' });
    });

    it('updates the description property', async function () {
      const ctx = {
        instance: { name: inst.name },
        organization: { name: 'inst-test-org' }
      };
      await instance.update(ctx, 'description', 'Updated description');
      const updated = await instance.get(ctx);
      assert.equal(updated.description, 'Updated description');
    });

    it('throws when trying to update a protected property', async function () {
      const ctx = {
        instance: { name: inst.name },
        organization: { name: 'inst-test-org' }
      };
      let threw = false;
      try {
        await instance.update(ctx, 'instance_id', 'evil-id');
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

  });

  // ── setInstanceConfig ─────────────────────────────────────────────────────────

  describe('setInstanceConfig', function () {

    let inst;

    before(async function () {
      inst = await createInstance('inst-test-org', { name: 'config-inst' });
    });

    it('stores a k8s config property', async function () {
      const ctx = {
        instance: { name: inst.name },
        organization: { name: 'inst-test-org' }
      };
      await instance.setInstanceConfig(ctx, 'volumeSize', '10Gi');
      // verify via pg-admin-client getInstanceConfig
      const { default: adminClient } = await import('../../services/lib/pg-admin-client.js');
      const cfg = await adminClient.getInstanceConfig(ctx);
      assert.equal(cfg.volumeSize, '10Gi');
    });

    it('overwrites an existing config property (upsert)', async function () {
      const ctx = {
        instance: { name: inst.name },
        organization: { name: 'inst-test-org' }
      };
      await instance.setInstanceConfig(ctx, 'volumeSize', '20Gi');
      const { default: adminClient } = await import('../../services/lib/pg-admin-client.js');
      const cfg = await adminClient.getInstanceConfig(ctx);
      assert.equal(cfg.volumeSize, '20Gi');
    });

  });

  // ── start / stop (K8s disabled) ───────────────────────────────────────────────

  describe('start / stop (K8s disabled)', function () {

    let inst;

    before(async function () {
      inst = await createInstance('inst-test-org', { name: 'startstop-inst', state: 'SLEEP' });
    });

    it('start() sets state to RUN when K8s is disabled', async function () {
      assert.isFalse(config.k8s.enabled, 'K8s must be disabled for this test');
      const ctx = {
        instance: { name: inst.name },
        organization: { name: 'inst-test-org' }
      };
      await instance.start(ctx);
      const updated = await instance.get(ctx);
      assert.equal(updated.state, 'RUN');
    });

    it('stop() sets state to SLEEP when K8s is disabled', async function () {
      assert.isFalse(config.k8s.enabled, 'K8s must be disabled for this test');
      const ctx = {
        instance: { name: inst.name },
        organization: { name: 'inst-test-org' }
      };
      await instance.stop(ctx);
      const updated = await instance.get(ctx);
      assert.equal(updated.state, 'SLEEP');
    });

  });

  // ── updatePriority ───────────────────────────────────────────────────────────

  describe('updatePriority', function () {

    let inst;

    before(async function () {
      inst = await createInstance('inst-test-org', { name: 'priority-inst' });
    });

    it('updates priority and returns updated=true', async function () {
      const result = await instance.get({
        instance: { name: inst.name },
        organization: { name: 'inst-test-org' }
      });
      const ctx = { instance: result, organization: { name: 'inst-test-org' } };

      const resp = await instance.updatePriority(ctx, 5);
      assert.isTrue(resp.updated);
      assert.equal(resp.newPriority, 5);
    });

    it('returns updated=false when priority is unchanged', async function () {
      const result = await instance.get({
        instance: { name: inst.name },
        organization: { name: 'inst-test-org' }
      });
      const ctx = { instance: result, organization: { name: 'inst-test-org' } };

      const resp = await instance.updatePriority(ctx, result.priority_state);
      assert.isFalse(resp.updated);
    });

    it('throws for priority out of range', async function () {
      const ctx = { instance: { priority_state: 0 }, organization: { name: 'inst-test-org' } };
      await assert.isRejected
        ? null  // chai-as-promised not installed, use try/catch
        : null;
      let threw = false;
      try {
        await instance.updatePriority(ctx, 11);
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

    it('throws for negative priority', async function () {
      const ctx = { instance: { priority_state: 0 }, organization: { name: 'inst-test-org' } };
      let threw = false;
      try {
        await instance.updatePriority(ctx, -1);
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

  });

  // ── STATES constants ─────────────────────────────────────────────────────────

  describe('STATES constants', function () {
    it('has all expected state values', function () {
      const expected = ['CREATING', 'RUN', 'STOPPING', 'SLEEP', 'ARCHIVE', 'ARCHIVING', 'RESTORING'];
      for (const state of expected) {
        assert.equal(instance.STATES[state], state);
      }
    });
  });

});
