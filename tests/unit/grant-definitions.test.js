import { assert } from 'chai';
import grantDefs from '../../services/lib/grant-definitions.js';

describe('grant-definitions', function () {

  // ── getGrant via privilege array ─────────────────────────────────────────────

  describe('getGrant (privilege array)', function () {

    it('DATABASE READ — triggered by CONNECT privilege', function () {
      const g = grantDefs.getGrant('DATABASE', ['CONNECT']);
      assert.equal(g.object, 'DATABASE');
      assert.equal(g.action, 'READ');
      assert.include(g.grant, 'CONNECT');
    });

    it('DATABASE WRITE — triggered by CREATE privilege', function () {
      const g = grantDefs.getGrant('DATABASE', ['CREATE', 'TEMPORARY']);
      assert.equal(g.action, 'WRITE');
    });

    it('SCHEMA READ — triggered by USAGE privilege', function () {
      const g = grantDefs.getGrant('SCHEMA', ['USAGE']);
      assert.equal(g.action, 'READ');
    });

    it('SCHEMA WRITE — triggered by CREATE privilege', function () {
      const g = grantDefs.getGrant('SCHEMA', ['CREATE']);
      assert.equal(g.action, 'WRITE');
    });

    it('TABLE READ — triggered by SELECT privilege', function () {
      const g = grantDefs.getGrant('TABLE', ['SELECT']);
      assert.equal(g.action, 'READ');
    });

    it('TABLE WRITE — triggered by INSERT privilege', function () {
      const g = grantDefs.getGrant('TABLE', ['INSERT', 'UPDATE']);
      assert.equal(g.action, 'WRITE');
    });

    it('FUNCTION EXECUTE — triggered by EXECUTE privilege', function () {
      const g = grantDefs.getGrant('FUNCTION', ['EXECUTE']);
      assert.equal(g.action, 'EXECUTE');
    });

    it('SEQUENCE READ — triggered by SELECT privilege', function () {
      const g = grantDefs.getGrant('SEQUENCE', ['SELECT']);
      assert.equal(g.action, 'READ');
    });

    it('SEQUENCE WRITE — triggered by UPDATE privilege', function () {
      const g = grantDefs.getGrant('SEQUENCE', ['UPDATE', 'USAGE']);
      assert.equal(g.action, 'WRITE');
    });

    it('TYPE WRITE — triggered by USAGE privilege', function () {
      const g = grantDefs.getGrant('TYPE', ['USAGE']);
      assert.equal(g.action, 'WRITE');
    });

    it('returns NONE grant when no matching privileges', function () {
      const g = grantDefs.getGrant('DATABASE', ['SOME_UNKNOWN_PRIV']);
      assert.equal(g.action, 'NONE');
      assert.deepEqual(g.grant, []);
    });

    it('returns NONE grant for empty privilege array', function () {
      const g = grantDefs.getGrant('TABLE', []);
      assert.equal(g.action, 'NONE');
    });

  });

  // ── getGrant via user object with pgPrivileges ────────────────────────────────

  describe('getGrant (user object with pgPrivileges)', function () {

    it('reads pgPrivileges from user object', function () {
      const user = { pgPrivileges: ['CONNECT'] };
      const g = grantDefs.getGrant('DATABASE', user);
      assert.equal(g.action, 'READ');
    });

    it('returns NONE when pgPrivileges is empty', function () {
      const user = { pgPrivileges: [] };
      const g = grantDefs.getGrant('DATABASE', user);
      assert.equal(g.action, 'NONE');
    });

    it('returns NONE when pgPrivileges is absent', function () {
      const g = grantDefs.getGrant('TABLE', {});
      assert.equal(g.action, 'NONE');
    });

  });

  // ── getGrant returns a deep copy ─────────────────────────────────────────────

  describe('getGrant returns deep copy', function () {

    it('mutating the returned grant does not affect the registry', function () {
      const g = grantDefs.getGrant('TABLE', ['SELECT']);
      g.grant.push('MUTATED');
      const g2 = grantDefs.getGrant('TABLE', ['SELECT']);
      assert.notInclude(g2.grant, 'MUTATED');
    });

  });

  // ── getRoleLabel ─────────────────────────────────────────────────────────────

  describe('getRoleLabel', function () {

    it('returns Viewer for READ', function () {
      assert.equal(grantDefs.getRoleLabel('TABLE', ['SELECT']), 'Viewer');
    });

    it('returns Editor for WRITE', function () {
      assert.equal(grantDefs.getRoleLabel('TABLE', ['INSERT']), 'Editor');
    });

    it('returns No Access when no matching privileges', function () {
      assert.equal(grantDefs.getRoleLabel('TABLE', []), 'No Access');
    });

  });

  // ── getNoAccessGrant ─────────────────────────────────────────────────────────

  describe('getNoAccessGrant', function () {

    it('returns object with action NONE and empty grant array', function () {
      const g = grantDefs.getNoAccessGrant('TABLE');
      assert.equal(g.object, 'TABLE');
      assert.equal(g.action, 'NONE');
      assert.deepEqual(g.grant, []);
      assert.equal(g.roleLabel, 'No Access');
    });

  });

  // ── getObjectGrants ──────────────────────────────────────────────────────────

  describe('getObjectGrants', function () {

    it('returns all registry entries for TABLE plus NONE', function () {
      const grants = grantDefs.getObjectGrants('TABLE');
      const actions = grants.map(g => g.action);
      assert.include(actions, 'READ');
      assert.include(actions, 'WRITE');
      assert.include(actions, 'NONE');
    });

    it('excludes NONE when excludeNoAccess is true', function () {
      const grants = grantDefs.getObjectGrants('TABLE', true);
      const actions = grants.map(g => g.action);
      assert.notInclude(actions, 'NONE');
    });

    it('returns only DATABASE entries for DATABASE', function () {
      const grants = grantDefs.getObjectGrants('DATABASE');
      for (const g of grants) {
        assert.equal(g.object, 'DATABASE');
      }
    });

  });

  // ── GRANTS lookup object ─────────────────────────────────────────────────────

  describe('GRANTS lookup object', function () {

    it('has DATABASE.READ with CONNECT', function () {
      assert.include(grantDefs.GRANTS.DATABASE.READ, 'CONNECT');
    });

    it('has TABLE.WRITE with INSERT', function () {
      assert.include(grantDefs.GRANTS.TABLE.WRITE, 'INSERT');
    });

    it('has SCHEMA.READ with USAGE', function () {
      assert.include(grantDefs.GRANTS.SCHEMA.READ, 'USAGE');
    });

  });

});
