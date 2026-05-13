import { assert } from 'chai';
import { reset } from '../helpers/db.js';
import { createOrg, createInstance, createDatabase, createInstanceUser } from '../helpers/fixtures.js';
import { admin } from '../../services/models/index.js';
import config from '../../services/lib/config.js';

describe('admin model', function () {

  before(async function () {
    await reset();
    await createOrg({ name: 'admin-test-org', title: 'Admin Test Org' });
    await createInstance('admin-test-org', { name: 'admin-test-inst', state: 'RUN' });
    await createDatabase('admin-test-org', 'admin-test-inst', {
      name: 'admin-test-db',
      title: 'Admin Test Database',
    });
    // create the public role user so getDatabases can find it
    await createInstanceUser('admin-test-org', 'admin-test-inst', {
      username: config.pgInstance.publicRole.username,
      type: 'PUBLIC',
      password: config.pgInstance.publicRole.password,
    });
  });

  after(async function () {
    await reset();
  });

  // ── getDatabases ──────────────────────────────────────────────────────────────

  describe('getDatabases', function () {

    it('returns an array of formatted database objects', async function () {
      const result = await admin.getDatabases();
      assert.isArray(result);
      assert.isAtLeast(result.length, 1);
    });

    it('each result has expected top-level fields', async function () {
      const result = await admin.getDatabases();
      const db = result[0];
      assert.isString(db.title);
      assert.isString(db.database);
      assert.isString(db.host);
      assert.equal(db.port, 5432);
      assert.isString(db.api);
    });

    it('each result has publicAccess with connection fields', async function () {
      const result = await admin.getDatabases();
      const db = result[0];
      assert.ok(db.publicAccess, 'publicAccess missing');
      assert.isString(db.publicAccess.username);
      assert.isString(db.publicAccess.connectionUri);
      assert.include(db.publicAccess.connectionUri, 'postgres://');
      assert.isString(db.publicAccess.psql);
    });

    it('database field includes org/db name', async function () {
      const result = await admin.getDatabases();
      const db = result.find(d => d.database.includes('admin-test-db'));
      assert.ok(db, 'admin-test-db not found in results');
      assert.include(db.database, 'admin-test-org');
    });

    it('filters by organization when opts.organization is provided', async function () {
      // create a second org+instance+db to confirm filtering works
      await createOrg({ name: 'admin-other-org', title: 'Admin Other Org' });
      await createInstance('admin-other-org', { name: 'admin-other-inst', state: 'RUN' });
      await createDatabase('admin-other-org', 'admin-other-inst', { name: 'other-db' });
      await createInstanceUser('admin-other-org', 'admin-other-inst', {
        username: config.pgInstance.publicRole.username,
        type: 'PUBLIC',
        password: config.pgInstance.publicRole.password,
      });

      const all = await admin.getDatabases();
      const filtered = await admin.getDatabases({ organization: 'admin-test-org' });

      assert.isBelow(filtered.length, all.length);
      for (const db of filtered) {
        assert.ok(db.organization, 'organization field missing');
        assert.equal(db.organization.name, 'admin-test-org');
      }
    });

  });

  // sleepInstances is omitted from integration tests: it calls instance.apply() which
  // invokes kubectl unconditionally regardless of config.k8s.enabled. E2E tests cover it.

});
