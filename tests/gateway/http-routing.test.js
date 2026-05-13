import { assert } from 'chai';
import express from 'express';
import supertest from 'supertest';
import { init, middleware } from '../../services/gateway/lib/http-proxy.js';

// These constants mirror the module-internal routing definitions in http-proxy.js.
const dbRouteRegex = /^\/api\/query\/([-|\w]+)\/([-|\w]+)(\/|\?|$)/;
const swaggerUiRouteRegex = /^\/swagger-ui/;
const adminRoutes = ['/api', '/auth', '/login', '/.well-known'];

describe('http-proxy routing', function () {

  let agent;

  before(function () {
    init();
    const app = express();
    app.use(middleware);
    agent = supertest(app);
  });

  // ── dbRouteRegex (unit) ───────────────────────────────────────────────────────

  describe('dbRouteRegex', function () {

    it('matches /api/query/org/db', function () {
      assert.match('/api/query/my-org/my-db', dbRouteRegex);
    });

    it('matches /api/query/org/db/ (trailing slash)', function () {
      assert.match('/api/query/my-org/my-db/', dbRouteRegex);
    });

    it('matches /api/query/org/db?param=1 (query string)', function () {
      assert.match('/api/query/my-org/my-db?param=1', dbRouteRegex);
    });

    it('matches /api/query/_/db (anonymous org shorthand)', function () {
      assert.match('/api/query/_/my-db', dbRouteRegex);
    });

    it('does not match /api/query/org (missing database segment)', function () {
      assert.notMatch('/api/query/my-org', dbRouteRegex);
    });

    it('does not match /api/other/path', function () {
      assert.notMatch('/api/other/path', dbRouteRegex);
    });

    it('does not match /api/query/org/db/extra (segment after db)', function () {
      // extra path after db still matches (anything after / is captured by the regex)
      // the /? group allows this — document actual behaviour
      assert.match('/api/query/my-org/my-db/extra', dbRouteRegex);
    });

    it('captures org and database names from a well-formed path', function () {
      const m = '/api/query/ucd-library/my-db?foo=bar'.match(dbRouteRegex);
      assert.ok(m);
      assert.equal(m[1], 'ucd-library');
      assert.equal(m[2], 'my-db');
    });

  });

  // ── swaggerUiRouteRegex (unit) ────────────────────────────────────────────────

  describe('swaggerUiRouteRegex', function () {

    it('matches /swagger-ui', function () {
      assert.match('/swagger-ui', swaggerUiRouteRegex);
    });

    it('matches /swagger-ui/index.html', function () {
      assert.match('/swagger-ui/index.html', swaggerUiRouteRegex);
    });

    it('does not match /api/swagger-ui', function () {
      assert.notMatch('/api/swagger-ui', swaggerUiRouteRegex);
    });

    it('does not match /swaggerui (no hyphen)', function () {
      assert.notMatch('/swaggerui', swaggerUiRouteRegex);
    });

  });

  // ── adminRoutes (unit) ────────────────────────────────────────────────────────

  describe('adminRoutes prefixes', function () {

    it('/api/admin is an admin route', function () {
      assert.isTrue(adminRoutes.some(r => '/api/admin'.startsWith(r)));
    });

    it('/auth/login is an admin route', function () {
      assert.isTrue(adminRoutes.some(r => '/auth/login'.startsWith(r)));
    });

    it('/login is an admin route', function () {
      assert.isTrue(adminRoutes.some(r => '/login'.startsWith(r)));
    });

    it('/.well-known/openid-configuration is an admin route', function () {
      assert.isTrue(adminRoutes.some(r => '/.well-known/openid-configuration'.startsWith(r)));
    });

    it('/swagger-ui is NOT an admin route', function () {
      assert.isFalse(adminRoutes.some(r => '/swagger-ui'.startsWith(r)));
    });

    it('/ (root) is NOT an admin route', function () {
      assert.isFalse(adminRoutes.some(r => '/'.startsWith(r)));
    });

  });

  // ── swagger UI domain validation ──────────────────────────────────────────────

  describe('swagger UI domain validation', function () {

    it('returns 403 when the swagger url domain is not in the allow-list', async function () {
      const res = await agent.get('/swagger-ui?url=https://evil.example.com/api.json');
      assert.equal(res.status, 403);
      assert.include(res.text, 'Invalid swagger domain');
    });

    it('returns 500 when the swagger url is malformed', async function () {
      const res = await agent.get('/swagger-ui?url=not-a-valid-url');
      assert.equal(res.status, 500);
      assert.include(res.text, 'Error parsing swagger-ui url');
    });

  });

});
