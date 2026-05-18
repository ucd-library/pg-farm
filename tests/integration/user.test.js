import { assert } from 'chai';
import { reset } from '../helpers/db.js';
import { createOrg, createInstance, createUser, createInstanceUser } from '../helpers/fixtures.js';
import user from '../../services/models/user.js';

describe('user model', function () {

  let org, inst;

  before(async function () {
    await reset();
    org = await createOrg({ name: 'user-test-org', title: 'User Test Org' });
    inst = await createInstance('user-test-org', { name: 'user-test-inst' });
  });

  after(async function () {
    await reset();
  });

  // ── getUserForLogging ─────────────────────────────────────────────────────────

  describe('getUserForLogging', function () {

    it('formats all user properties as key:"value" pairs', function () {
      const result = user.getUserForLogging({ username: 'alice', type: 'USER' });
      assert.include(result, 'username:"alice"');
      assert.include(result, 'type:"USER"');
    });

    it('redacts the password field', function () {
      const result = user.getUserForLogging({ username: 'alice', password: 'secret' });
      assert.include(result, 'password: <hidden>');
      assert.notInclude(result, 'secret');
    });

  });

  // ── checkPermissionType ───────────────────────────────────────────────────────

  describe('checkPermissionType', function () {

    it('does not throw for READ', function () {
      assert.doesNotThrow(() => user.checkPermissionType('READ'));
    });

    it('does not throw for WRITE', function () {
      assert.doesNotThrow(() => user.checkPermissionType('WRITE'));
    });

    it('throws for an invalid type', function () {
      let threw = false;
      try {
        user.checkPermissionType('DELETE');
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

  });

  // ── getPgFarmUser / pgFarmUserExists ──────────────────────────────────────────

  describe('getPgFarmUser / pgFarmUserExists', function () {

    before(async function () {
      await createInstanceUser('user-test-org', 'user-test-inst', {
        username: 'pgfarm-lookup-user',
        type: 'USER',
      });
    });

    it('getPgFarmUser returns the user record', async function () {
      const result = await user.getPgFarmUser('pgfarm-lookup-user');
      assert.ok(result);
      assert.equal(result.username, 'pgfarm-lookup-user');
    });

    it('getPgFarmUser throws for unknown user (get_user_id raises)', async function () {
      let threw = false;
      try {
        await user.getPgFarmUser('no-such-user-xyz');
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

    it('pgFarmUserExists returns true for known user', async function () {
      const result = await user.pgFarmUserExists('pgfarm-lookup-user');
      assert.isTrue(result);
    });

    it('pgFarmUserExists throws for unknown user (propagates get_user_id error)', async function () {
      let threw = false;
      try {
        await user.pgFarmUserExists('no-such-user-xyz');
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

  });

  // ── get / exists ──────────────────────────────────────────────────────────────

  describe('get / exists', function () {

    let instanceUser;

    before(async function () {
      instanceUser = await createInstanceUser('user-test-org', 'user-test-inst', {
        username: 'get-exists-user',
        type: 'USER',
      });
    });

    it('get() returns the instance user record', async function () {
      const ctx = {
        instance: { name: 'user-test-inst' },
        organization: { name: 'user-test-org' }
      };
      const result = await user.get(ctx, 'get-exists-user');
      assert.ok(result);
      assert.equal(result.username, 'get-exists-user');
    });

    it('get() throws for unknown username', async function () {
      const ctx = {
        instance: { name: 'user-test-inst' },
        organization: { name: 'user-test-org' }
      };
      let threw = false;
      try {
        await user.get(ctx, 'no-such-user-xyz');
      } catch (e) {
        threw = true;
      }
      assert.isTrue(threw);
    });

    it('exists() returns the user object when found', async function () {
      const ctx = {
        instance: { name: 'user-test-inst' },
        organization: { name: 'user-test-org' }
      };
      const result = await user.exists(ctx, 'get-exists-user');
      assert.ok(result);
      assert.equal(result.username, 'get-exists-user');
    });

    it('exists() returns false for unknown username', async function () {
      const ctx = {
        instance: { name: 'user-test-inst' },
        organization: { name: 'user-test-org' }
      };
      const result = await user.exists(ctx, 'no-such-user-xyz');
      assert.isFalse(result);
    });

  });

  // ── updateType ────────────────────────────────────────────────────────────────

  describe('updateType', function () {

    let instanceUser;

    before(async function () {
      instanceUser = await createInstanceUser('user-test-org', 'user-test-inst', {
        username: 'type-change-user',
        type: 'USER',
      });
    });

    it('updates the instance user type in the DB', async function () {
      const ctx = {
        instance: { name: 'user-test-inst' },
        organization: { name: 'user-test-org' }
      };
      await user.updateType(ctx, { username: 'type-change-user' }, 'ADMIN');

      const updated = await user.get(ctx, 'type-change-user');
      assert.equal(updated.user_type, 'ADMIN');
    });

  });

  // ── ALLOWED_PERMISSION_TYPES ──────────────────────────────────────────────────

  describe('ALLOWED_PERMISSION_TYPES constant', function () {

    it('contains READ and WRITE', function () {
      assert.include(user.ALLOWED_PERMISSION_TYPES, 'READ');
      assert.include(user.ALLOWED_PERMISSION_TYPES, 'WRITE');
    });

  });

});
