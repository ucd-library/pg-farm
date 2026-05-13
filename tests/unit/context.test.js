import { assert } from 'chai';
import { getContext, createContext, store } from '../../services/lib/context.js';

describe('context', function () {

  // ── getContext ───────────────────────────────────────────────────────────────

  describe('getContext', function () {

    it('returns the object as-is when not a string', function () {
      const obj = { organization: { name: 'test' } };
      assert.strictEqual(getContext(obj), obj);
    });

    it('returns undefined for an unknown trace ID string', function () {
      assert.isUndefined(getContext('no-such-trace-id'));
    });

    it('retrieves a context from the store by corkTraceId', async function () {
      const ctx = await createContext({ corkTraceId: 'test-trace-123' });
      store.set('test-trace-123', ctx);
      assert.strictEqual(getContext('test-trace-123'), ctx);
      store.delete('test-trace-123');
    });

  });

  // ── createContext ────────────────────────────────────────────────────────────

  describe('createContext', function () {

    it('creates a context with a generated corkTraceId', async function () {
      const ctx = await createContext({});
      assert.isString(ctx.corkTraceId);
      assert.isNotEmpty(ctx.corkTraceId);
    });

    it('preserves a provided corkTraceId', async function () {
      const ctx = await createContext({ corkTraceId: 'my-trace' });
      assert.equal(ctx.corkTraceId, 'my-trace');
    });

    it('initializes with null organization when none provided', async function () {
      const ctx = await createContext({});
      assert.isNull(ctx.organization);
    });

    it('sets organization as plain object when org name not in DB', async function () {
      // createContext tries to look up the org — falls back to {name: X} on miss
      const ctx = await createContext({ organization: 'no-such-org-xyz' });
      assert.equal(ctx.organization.name, 'no-such-org-xyz');
    });

    it('populates logSignal with corkTraceId', async function () {
      const ctx = await createContext({ corkTraceId: 'log-trace' });
      assert.equal(ctx.logSignal.corkTraceId, 'log-trace');
    });

  });

  // ── property setters ─────────────────────────────────────────────────────────

  describe('property setters', function () {

    it('setting organization updates logSignal.organization', async function () {
      const ctx = await createContext({});
      ctx.organization = { name: 'my-org' };
      assert.equal(ctx.logSignal.organization, 'my-org');
    });

    it('setting database updates fullDatabaseName', async function () {
      const ctx = await createContext({});
      ctx.organization = { name: 'my-org' };
      ctx.database = { name: 'my-db' };
      assert.equal(ctx.fullDatabaseName, 'my-org/my-db');
    });

    it('fullDatabaseName uses _ when organization is not set', async function () {
      const ctx = await createContext({});
      ctx.database = { name: 'my-db' };
      assert.equal(ctx.fullDatabaseName, '_/my-db');
    });

    it('setting instance updates logSignal.instance', async function () {
      const ctx = await createContext({});
      ctx.instance = { name: 'my-inst' };
      assert.equal(ctx.logSignal.instance, 'my-inst');
    });

    it('setting requestor updates logSignal.requestor', async function () {
      const ctx = await createContext({});
      ctx.requestor = 'alice';
      assert.equal(ctx.logSignal.requestor, 'alice');
    });

  });

  // ── clone ────────────────────────────────────────────────────────────────────

  describe('clone', function () {

    it('produces an independent copy', async function () {
      const ctx = await createContext({ corkTraceId: 'clone-trace' });
      ctx.organization = { name: 'orig-org' };
      const copy = ctx.clone();

      copy.organization = { name: 'mutated-org' };
      assert.equal(ctx.organization.name, 'orig-org');
      assert.equal(copy.organization.name, 'mutated-org');
    });

    it('preserves corkTraceId', async function () {
      const ctx = await createContext({ corkTraceId: 'clone-trace-2' });
      const copy = ctx.clone();
      assert.equal(copy.corkTraceId, 'clone-trace-2');
    });

    it('clone logSignal is independent', async function () {
      const ctx = await createContext({ corkTraceId: 'clone-trace-3' });
      const copy = ctx.clone();
      copy.logSignal.extra = 'injected';
      assert.isUndefined(ctx.logSignal.extra);
    });

  });

  // ── update ───────────────────────────────────────────────────────────────────

  describe('update', function () {

    it('updates corkTraceId via update()', async function () {
      const ctx = await createContext({});
      await ctx.update({ corkTraceId: 'updated-trace' });
      assert.equal(ctx.corkTraceId, 'updated-trace');
    });

    it('falls back to {name: X} for unknown organization', async function () {
      const ctx = await createContext({});
      await ctx.update({ organization: 'unknown-org-abc' });
      assert.equal(ctx.organization.name, 'unknown-org-abc');
    });

    it('sets organization to {name: null} for "_" sentinel', async function () {
      const ctx = await createContext({});
      await ctx.update({ organization: '_' });
      assert.isNull(ctx.organization.name);
    });

  });

});
