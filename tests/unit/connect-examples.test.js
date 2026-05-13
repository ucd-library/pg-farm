import { assert } from 'chai';
import ConnectExamples from '../../services/lib/connect-examples.js';

const OPTS = {
  user: 'testuser',
  host: 'pgfarm.example.com',
  port: 5432,
  database: 'myorg/mydb',
  password: 'hunter2',
  queryPath: 'https://pgfarm.example.com/api/query',
};

describe('connect-examples', function () {

  // ── getConnectionTypes ───────────────────────────────────────────────────────

  describe('getConnectionTypes', function () {

    it('includes all types when logged in', function () {
      const ex = new ConnectExamples(OPTS);
      const types = ex.getConnectionTypes(true);
      assert.include(types, 'psql');
      assert.include(types, 'psql-full');
      assert.include(types, 'nodejs');
      assert.include(types, 'python');
      assert.include(types, 'r');
      assert.include(types, 'json');
      assert.include(types, 'yaml');
      assert.include(types, 'http');
    });

    it('excludes loggedInOnly types when not logged in', function () {
      const ex = new ConnectExamples(OPTS);
      const types = ex.getConnectionTypes(false);
      assert.notInclude(types, 'psql');   // loggedInOnly
      assert.include(types, 'psql-full'); // not loggedInOnly
      assert.include(types, 'nodejs');
    });

  });

  // ── getConnectionType ────────────────────────────────────────────────────────

  describe('getConnectionType', function () {

    it('throws for unknown connection type', function () {
      const ex = new ConnectExamples(OPTS);
      assert.throws(() => ex.getConnectionType('no-such-type'), /Unknown connection type/);
    });

  });

  // ── getPrismLang ─────────────────────────────────────────────────────────────

  describe('getPrismLang', function () {

    it('psql returns bash', function () {
      const ex = new ConnectExamples(OPTS);
      assert.equal(ex.getPrismLang('psql'), 'bash');
    });

    it('nodejs returns javascript', function () {
      const ex = new ConnectExamples(OPTS);
      assert.equal(ex.getPrismLang('nodejs'), 'javascript');
    });

    it('python returns python', function () {
      const ex = new ConnectExamples(OPTS);
      assert.equal(ex.getPrismLang('python'), 'python');
    });

    it('json returns json', function () {
      const ex = new ConnectExamples(OPTS);
      assert.equal(ex.getPrismLang('json'), 'json');
    });

    it('yaml returns yaml', function () {
      const ex = new ConnectExamples(OPTS);
      assert.equal(ex.getPrismLang('yaml'), 'yaml');
    });

    it('r returns r', function () {
      const ex = new ConnectExamples(OPTS);
      assert.equal(ex.getPrismLang('r'), 'r');
    });

  });

  // ── template: psql ──────────────────────────────────────────────────────────

  describe('template: psql', function () {

    it('contains PGSERVICE and database name', function () {
      const ex = new ConnectExamples(OPTS);
      const out = ex.getTemplate('psql');
      assert.include(out, 'PGSERVICE=pgfarm');
      assert.include(out, OPTS.database);
    });

  });

  // ── template: psql-full ──────────────────────────────────────────────────────

  describe('template: psql-full', function () {

    it('contains host, port, user, and database', function () {
      const ex = new ConnectExamples(OPTS);
      const out = ex.getTemplate('psql-full');
      assert.include(out, OPTS.host);
      assert.include(out, String(OPTS.port));
      assert.include(out, OPTS.user);
      assert.include(out, OPTS.database);
    });

    it('includes literal password when password is set', function () {
      const ex = new ConnectExamples(OPTS);
      const out = ex.getTemplate('psql-full');
      assert.include(out, `PGPASSWORD="${OPTS.password}"`);
    });

    it('uses pgfarm auth token when no password', function () {
      const ex = new ConnectExamples({ ...OPTS, password: '' });
      const out = ex.getTemplate('psql-full');
      assert.include(out, 'pgfarm auth token');
    });

    it('includes PGSSLMODE verify-full', function () {
      const ex = new ConnectExamples(OPTS);
      const out = ex.getTemplate('psql-full');
      assert.include(out, 'verify-full');
    });

  });

  // ── template: json ───────────────────────────────────────────────────────────

  describe('template: json', function () {

    it('is valid JSON', function () {
      const ex = new ConnectExamples(OPTS);
      const out = ex.getTemplate('json');
      assert.doesNotThrow(() => JSON.parse(out));
    });

    it('JSON contains host, port, user, database', function () {
      const ex = new ConnectExamples(OPTS);
      const parsed = JSON.parse(ex.getTemplate('json'));
      assert.equal(parsed.host, OPTS.host);
      assert.equal(parsed.port, OPTS.port);
      assert.equal(parsed.user, OPTS.user);
      assert.equal(parsed.database, OPTS.database);
    });

    it('uses placeholder when no password provided', function () {
      const ex = new ConnectExamples({ ...OPTS, password: '' });
      const parsed = JSON.parse(ex.getTemplate('json'));
      assert.equal(parsed.password, '<PASSWORD>');
    });

  });

  // ── template: yaml ───────────────────────────────────────────────────────────

  describe('template: yaml', function () {

    it('contains host and database', function () {
      const ex = new ConnectExamples(OPTS);
      const out = ex.getTemplate('yaml');
      assert.include(out, OPTS.host);
      assert.include(out, OPTS.database);
    });

  });

  // ── template: nodejs ─────────────────────────────────────────────────────────

  describe('template: nodejs', function () {

    it('contains host, port, user, database', function () {
      const ex = new ConnectExamples(OPTS);
      const out = ex.getTemplate('nodejs');
      assert.include(out, OPTS.host);
      assert.include(out, String(OPTS.port));
      assert.include(out, OPTS.user);
      assert.include(out, OPTS.database);
    });

    it('includes literal password when set', function () {
      const ex = new ConnectExamples(OPTS);
      const out = ex.getTemplate('nodejs');
      assert.include(out, `'${OPTS.password}'`);
    });

    it('uses process.env.PGPASSWORD when no password', function () {
      const ex = new ConnectExamples({ ...OPTS, password: '' });
      const out = ex.getTemplate('nodejs');
      assert.include(out, 'process.env.PGPASSWORD');
    });

  });

  // ── template: python ─────────────────────────────────────────────────────────

  describe('template: python', function () {

    it('contains database name', function () {
      const ex = new ConnectExamples(OPTS);
      const out = ex.getTemplate('python');
      assert.include(out, OPTS.database);
    });

    it('includes literal password when set', function () {
      const ex = new ConnectExamples(OPTS);
      const out = ex.getTemplate('python');
      assert.include(out, `'${OPTS.password}'`);
    });

    it('uses os.environ when no password', function () {
      const ex = new ConnectExamples({ ...OPTS, password: '' });
      const out = ex.getTemplate('python');
      assert.include(out, 'os.environ');
    });

  });

  // ── template: r ──────────────────────────────────────────────────────────────

  describe('template: r', function () {

    it('contains database name', function () {
      const ex = new ConnectExamples(OPTS);
      const out = ex.getTemplate('r');
      assert.include(out, OPTS.database);
    });

    it('uses Sys.getenv when no password', function () {
      const ex = new ConnectExamples({ ...OPTS, password: '' });
      const out = ex.getTemplate('r');
      assert.include(out, 'Sys.getenv');
    });

  });

  // ── template: http ───────────────────────────────────────────────────────────

  describe('template: http', function () {

    it('contains queryPath and database', function () {
      const ex = new ConnectExamples(OPTS);
      const out = ex.getTemplate('http');
      assert.include(out, OPTS.queryPath);
      assert.include(out, OPTS.database);
    });

    it('includes auth header when password set', function () {
      const ex = new ConnectExamples(OPTS);
      const out = ex.getTemplate('http');
      assert.include(out, 'Authorization');
    });

  });

  // ── setOpts ──────────────────────────────────────────────────────────────────

  describe('setOpts', function () {

    it('overrides defaults', function () {
      const ex = new ConnectExamples();
      ex.setOpts({ user: 'newuser', host: 'newhost.example.com' });
      const out = ex.getTemplate('psql-full');
      assert.include(out, 'newuser');
      assert.include(out, 'newhost.example.com');
    });

    it('preserves defaults for unspecified fields', function () {
      const ex = new ConnectExamples({ user: 'partial' });
      assert.equal(ex.opts.port, 5432);
      assert.equal(ex.opts.host, 'pgfarm.library.ucdavis.edu');
    });

  });

});
