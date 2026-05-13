import { assert } from 'chai';
import config from '../../services/lib/config.js';

// env.cjs sets the values these tests assert against

describe('config', function () {

  // ── structure ────────────────────────────────────────────────────────────────

  describe('structure', function () {

    it('has all top-level sections', function () {
      const sections = [
        'service', 'jwt', 'client', 'smtp', 'gateway',
        'backup', 'oidc', 'gc', 'k8s', 'adminDb',
        'pgInstance', 'pgRest', 'pgHelper', 'proxy',
        'healthProbe', 'metrics'
      ];
      for (const section of sections) {
        assert.property(config, section, `missing section: ${section}`);
      }
    });

  });

  // ── adminDb ──────────────────────────────────────────────────────────────────

  describe('adminDb', function () {

    it('reads PG_HOST from env', function () {
      assert.equal(config.adminDb.host, 'localhost');
    });

    it('reads PG_PORT from env', function () {
      // env.cjs sets PG_PORT=15432; config stores it as a string
      assert.equal(String(config.adminDb.port), '15432');
    });

    it('reads PG_USERNAME from env', function () {
      assert.equal(config.adminDb.username, 'postgres');
    });

    it('reads PG_DATABASE from env', function () {
      assert.equal(config.adminDb.database, 'postgres');
    });

    it('reads PG_SCHEMA from env', function () {
      assert.equal(config.adminDb.schema, 'pgfarm');
    });

    it('tables are prefixed with schema', function () {
      assert.equal(config.adminDb.tables.ORGANIZATION, 'pgfarm.organization');
      assert.equal(config.adminDb.tables.INSTANCE, 'pgfarm.instance');
      assert.equal(config.adminDb.tables.DATABASE, 'pgfarm.database');
      assert.equal(config.adminDb.tables.USER, 'pgfarm.user');
      assert.equal(config.adminDb.tables.INSTANCE_USER, 'pgfarm.instance_user');
      assert.equal(config.adminDb.tables.USER_TOKEN, 'pgfarm.user_token');
      assert.equal(config.adminDb.tables.INSTANCE_CONFIG, 'pgfarm.k8s_config_property');
    });

    it('views are prefixed with schema', function () {
      assert.match(config.adminDb.views.INSTANCE, /^pgfarm\./);
      assert.match(config.adminDb.views.INSTANCE_DATABASE, /^pgfarm\./);
      assert.match(config.adminDb.views.ORGANIZATION_USER, /^pgfarm\./);
    });

    it('table computed properties update when schema changes', function () {
      // Computed props use getters — test that they reflect the schema value
      const original = config.adminDb.schema;
      config.adminDb.schema = 'other';
      assert.equal(config.adminDb.tables.ORGANIZATION, 'other.organization');
      config.adminDb.schema = original; // restore
    });

  });

  // ── jwt ──────────────────────────────────────────────────────────────────────

  describe('jwt', function () {

    it('reads JWT_SECRET from env', function () {
      assert.equal(config.jwt.secret, 'pg-farm-test-secret-do-not-use-in-prod');
    });

    it('has default cookieName', function () {
      assert.equal(config.jwt.cookieName, 'pgfarm-token');
    });

  });

  // ── k8s ──────────────────────────────────────────────────────────────────────

  describe('k8s', function () {

    it('is disabled when K8S_DISABLED=true', function () {
      assert.isFalse(config.k8s.enabled);
    });

  });

  // ── metrics ──────────────────────────────────────────────────────────────────

  describe('metrics', function () {

    it('is disabled when METRICS_ENABLED is not true', function () {
      assert.isFalse(config.metrics.enabled);
    });

  });

  // ── pgInstance ───────────────────────────────────────────────────────────────

  describe('pgInstance', function () {

    it('has all state constants', function () {
      const states = ['CREATING', 'RUN', 'STOPPING', 'SLEEP', 'ARCHIVE', 'ARCHIVING', 'RESTORING'];
      for (const state of states) {
        assert.equal(config.pgInstance.states[state], state);
      }
    });

    it('availableStates ALWAYS is -1', function () {
      assert.equal(config.pgInstance.availableStates.ALWAYS, -1);
    });

    it('availableStates are in descending duration order', function () {
      const { HIGH, MEDIUM, LOW } = config.pgInstance.availableStates;
      assert.isAbove(HIGH, MEDIUM);
      assert.isAbove(MEDIUM, LOW);
    });

  });

  // ── service ──────────────────────────────────────────────────────────────────

  describe('service', function () {

    it('port is a number', function () {
      assert.isNumber(config.service.port);
    });

    it('url is a string', function () {
      assert.isString(config.service.url);
    });

  });

});
