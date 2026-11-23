import { assert } from 'chai';
import {
  classifyAccess,
  normalizePrivileges,
  relkindToType,
  summarizeDatabase,
  totalCounts
} from '../../services/lib/role-privilege-summary.js';

describe('role-privilege-summary', function () {

  // ── classifyAccess ────────────────────────────────────────────────────────────

  describe('classifyAccess', function () {

    it('SELECT only is READ', function () {
      assert.equal(classifyAccess(['SELECT']), 'READ');
    });

    for (const priv of ['INSERT', 'UPDATE', 'DELETE', 'TRUNCATE']) {
      it(`${priv} is WRITE`, function () {
        assert.equal(classifyAccess([priv]), 'WRITE');
      });
    }

    it('SELECT plus INSERT is WRITE', function () {
      assert.equal(classifyAccess(['SELECT', 'INSERT']), 'WRITE');
    });

    it('REFERENCES/TRIGGER only is OTHER', function () {
      assert.equal(classifyAccess(['REFERENCES', 'TRIGGER']), 'OTHER');
    });

    it('empty is OTHER', function () {
      assert.equal(classifyAccess([]), 'OTHER');
      assert.equal(classifyAccess(), 'OTHER');
    });

    it('is case insensitive', function () {
      assert.equal(classifyAccess(['select']), 'READ');
      assert.equal(classifyAccess(['update']), 'WRITE');
    });

  });

  // ── normalizePrivileges ───────────────────────────────────────────────────────

  describe('normalizePrivileges', function () {

    it('parses a postgres array literal string', function () {
      assert.deepEqual(normalizePrivileges('{SELECT,INSERT}'), ['SELECT', 'INSERT']);
    });

    it('handles empty array literal', function () {
      assert.deepEqual(normalizePrivileges('{}'), []);
    });

    it('handles null/undefined', function () {
      assert.deepEqual(normalizePrivileges(null), []);
      assert.deepEqual(normalizePrivileges(undefined), []);
    });

    it('passes arrays through uppercased', function () {
      assert.deepEqual(normalizePrivileges(['select']), ['SELECT']);
    });

  });

  // ── relkindToType ─────────────────────────────────────────────────────────────

  describe('relkindToType', function () {

    it('maps relkinds to types', function () {
      assert.equal(relkindToType('r'), 'TABLE');
      assert.equal(relkindToType('p'), 'TABLE');
      assert.equal(relkindToType('v'), 'VIEW');
      assert.equal(relkindToType('m'), 'MATERIALIZED VIEW');
      assert.equal(relkindToType('f'), 'FOREIGN TABLE');
      assert.equal(relkindToType('x'), 'OTHER');
    });

  });

  // ── summarizeDatabase ─────────────────────────────────────────────────────────

  describe('summarizeDatabase', function () {

    const privs = {
      relations: [
        { schema_name: 'api', name: 'readings', relkind: 'v', privileges: ['SELECT'], column_level: false },
        { schema_name: 'data', name: 'raw', relkind: 'r', privileges: '{INSERT,SELECT,UPDATE}', column_level: false },
        { schema_name: 'data', name: 'cols', relkind: 'r', privileges: ['SELECT'], column_level: true },
        { schema_name: 'data', name: 'refs', relkind: 'r', privileges: ['REFERENCES'], column_level: false },
      ],
      schemas: [
        { schema_name: 'api', privileges: ['USAGE'] },
      ],
      defaultAclCount: 2,
      databasePrivileges: ['CONNECT'],
    };

    it('classifies each table/view', function () {
      const s = summarizeDatabase('my-db', privs);
      assert.equal(s.database, 'my-db');
      assert.lengthOf(s.tables, 4);

      const readings = s.tables.find(t => t.name === 'readings');
      assert.equal(readings.type, 'VIEW');
      assert.equal(readings.access, 'READ');
      assert.equal(readings.schema, 'api');

      const raw = s.tables.find(t => t.name === 'raw');
      assert.equal(raw.type, 'TABLE');
      assert.equal(raw.access, 'WRITE');
      assert.deepEqual(raw.privileges, ['INSERT', 'SELECT', 'UPDATE']);

      const cols = s.tables.find(t => t.name === 'cols');
      assert.isTrue(cols.columnLevel);

      const refs = s.tables.find(t => t.name === 'refs');
      assert.equal(refs.access, 'OTHER');
    });

    it('counts read/write/other', function () {
      const s = summarizeDatabase('my-db', privs);
      assert.deepEqual(s.counts, { read: 2, write: 1, other: 1 });
    });

    it('includes schemas, database privileges and default privilege count', function () {
      const s = summarizeDatabase('my-db', privs);
      assert.deepEqual(s.schemas, [{ name: 'api', privileges: ['USAGE'] }]);
      assert.deepEqual(s.databasePrivileges, ['CONNECT']);
      assert.equal(s.defaultPrivilegeCount, 2);
    });

    it('handles empty input', function () {
      const s = summarizeDatabase('empty-db', {});
      assert.deepEqual(s.tables, []);
      assert.deepEqual(s.schemas, []);
      assert.deepEqual(s.counts, { read: 0, write: 0, other: 0 });
      assert.equal(s.defaultPrivilegeCount, 0);
    });

  });

  // ── totalCounts ───────────────────────────────────────────────────────────────

  describe('totalCounts', function () {

    it('sums counts across databases', function () {
      const total = totalCounts([
        { counts: { read: 1, write: 2, other: 0 } },
        { counts: { read: 3, write: 0, other: 1 } },
      ]);
      assert.deepEqual(total, { read: 4, write: 2, other: 1 });
    });

    it('returns zeros for no databases', function () {
      assert.deepEqual(totalCounts([]), { read: 0, write: 0, other: 0 });
    });

  });

});
