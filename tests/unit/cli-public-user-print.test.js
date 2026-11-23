import { assert } from 'chai';
import sinon from 'sinon';
import colors from '../../tools/node_modules/colors/safe.js';
import print from '../../tools/cli/lib/print.js';
import { wrapLines, confirmYes, printWarningBox } from '../../tools/cli/lib/confirm.js';

/**
 * @function captureLog
 * @description capture console.log output from a function
 *
 * @param {Function} fn
 * @returns {String} captured output with colors stripped
 */
function captureLog(fn) {
  const lines = [];
  const stub = sinon.stub(console, 'log').callsFake((...args) => lines.push(args.join(' ')));
  try {
    fn();
  } finally {
    stub.restore();
  }
  return colors.strip(lines.join('\n'));
}

const SUMMARY = {
  organization: 'my-org',
  instance: 'inst-my-db',
  instanceState: 'RUN',
  instanceRunning: true,
  username: 'pgfarm-public',
  enabled: true,
  pgRestAnonymous: true,
  roleExists: true,
  recentLogins: { lastLogin: '2026-11-01T00:00:00.000Z', count30d: 4 },
  counts: { read: 2, write: 1, other: 0 },
  errors: [],
  databases: [{
    database: 'my-db',
    tables: [
      { schema: 'api', name: 'readings', type: 'VIEW', access: 'READ', columnLevel: false },
      { schema: 'data', name: 'raw', type: 'TABLE', access: 'WRITE', columnLevel: false },
      { schema: 'data', name: 'cols', type: 'TABLE', access: 'READ', columnLevel: true },
    ],
    schemas: [{ name: 'api', privileges: ['USAGE'] }],
    databasePrivileges: [],
    defaultPrivilegeCount: 2,
    counts: { read: 2, write: 1, other: 0 },
  }],
};

describe('CLI public user printing', function () {

  describe('print.publicUserSummary', function () {

    it('prints status, login activity and READ/WRITE lists per database', function () {
      const out = captureLog(() => print.publicUserSummary(SUMMARY));
      assert.include(out, 'Public user: pgfarm-public');
      assert.include(out, 'Instance: my-org/inst-my-db (RUN)');
      assert.include(out, 'Status: ENABLED');
      assert.include(out, 'Anonymous PostgREST API access: on');
      assert.include(out, 'Last public SQL login (gateway): 2026-11-01T00:00:00.000Z, logins in last 30 days: 4');
      assert.include(out, '1 table/view(s) with WRITE, 2 with READ');
      assert.include(out, 'Database: my-db');
      assert.include(out, 'WRITE (1):');
      assert.include(out, '- data.raw (TABLE)');
      assert.include(out, 'READ (2):');
      assert.include(out, '- api.readings (VIEW)');
      assert.include(out, '- data.cols (TABLE, column level)');
      assert.include(out, 'Schemas: api (USAGE)');
      assert.include(out, 'Default privilege entries: 2');
    });

    it('notes when the instance is not running', function () {
      const out = captureLog(() => print.publicUserSummary({
        ...SUMMARY, instanceRunning: false, instanceState: 'SLEEP', databases: []
      }));
      assert.include(out, 'Instance is not running (SLEEP)');
      assert.notInclude(out, 'Database:');
    });

    it('notes when the role does not exist', function () {
      const out = captureLog(() => print.publicUserSummary({
        ...SUMMARY, enabled: false, pgRestAnonymous: false, roleExists: false, databases: []
      }));
      assert.include(out, 'Status: DISABLED');
      assert.include(out, 'Anonymous PostgREST API access: off');
      assert.include(out, 'role does not exist');
    });

    it('prints "never" when there are no public logins', function () {
      const out = captureLog(() => print.publicUserSummary({
        ...SUMMARY, recentLogins: { lastLogin: null, count30d: 0 }
      }));
      assert.include(out, 'Last public SQL login (gateway): never');
    });

  });

  describe('print.publicUserReport', function () {

    it('prints each instance and the enabled count', function () {
      const out = captureLog(() => print.publicUserReport([
        { organization: 'o', instance: 'inst-a', state: 'RUN', publicUserEnabled: true, databases: ['a'], lastPublicLogin: null, publicLogins30d: 0,
          summary: { counts: { read: 3, write: 1 } } },
        { organization: 'o', instance: 'inst-b', state: 'SLEEP', publicUserEnabled: true, databases: ['b'], lastPublicLogin: null, publicLogins30d: 0,
          summary: { skipped: 'instance not running' } },
        { organization: null, instance: 'inst-c', state: 'RUN', publicUserEnabled: false, databases: [] },
      ]));
      assert.include(out, '2 of 3 instance(s) have the public user enabled');
      assert.include(out, 'o/inst-a [RUN] ENABLED');
      assert.include(out, 'Permissions: 1 WRITE, 3 READ table/view(s)');
      assert.include(out, 'Permissions: skipped (instance not running)');
      assert.include(out, '_/inst-c [RUN] disabled');
    });

  });

  describe('confirm helpers', function () {

    it('wrapLines wraps long lines on word boundaries', function () {
      const lines = wrapLines(['one two three four five six'], 10);
      assert.deepEqual(lines, ['one two', 'three four', 'five six']);
      assert.isTrue(lines.every(l => l.length <= 10));
    });

    it('wrapLines keeps blank lines', function () {
      assert.deepEqual(wrapLines(['a', '', 'b'], 10), ['a', '', 'b']);
    });

    it('printWarningBox includes the title and text', function () {
      const out = captureLog(() => printWarningBox('WARNING', ['Disabling removes permissions']));
      assert.include(out, 'WARNING');
      assert.include(out, 'Disabling removes permissions');
    });

    it('confirmYes refuses without a TTY (requires --yes for scripts)', async function () {
      const isTTY = process.stdin.isTTY;
      const errStub = sinon.stub(console, 'error');
      process.stdin.isTTY = false;
      try {
        assert.isFalse(await confirmYes('Type yes:'));
        assert.include(errStub.firstCall.args[0], '--yes');
      } finally {
        process.stdin.isTTY = isTTY;
        errStub.restore();
      }
    });

  });

});
