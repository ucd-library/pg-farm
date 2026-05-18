import { assert } from 'chai';
import express from 'express';
import supertest from 'supertest';
import fs from 'fs';
import cidrDeny from '../../services/gateway/lib/cidr-deny.js';

/**
 * Builds a minimal Express app with cidrDeny middleware mounted.
 * trust proxy is enabled so X-Forwarded-For headers control req.ip.
 */
function makeApp(config) {
  const app = express();
  app.set('trust proxy', true);
  app.use(cidrDeny(config));
  app.get('/', (req, res) => res.status(200).send('ok'));
  return supertest(app);
}

describe('cidr-deny middleware', function () {

  afterEach(function () {
    delete process.env.CIDR_DENY_LIST;
  });

  // ── no list ───────────────────────────────────────────────────────────────────

  describe('no CIDR list configured', function () {

    it('passes all requests through', async function () {
      const res = await makeApp({}).get('/');
      assert.equal(res.status, 200);
    });

  });

  // ── CIDR_DENY_LIST env var ────────────────────────────────────────────────────

  describe('CIDR_DENY_LIST env var', function () {

    it('returns 403 when the request IP is inside the deny range', async function () {
      process.env.CIDR_DENY_LIST = '10.0.0.0/8';
      const res = await makeApp({}).get('/').set('X-Forwarded-For', '10.1.2.3');
      assert.equal(res.status, 403);
    });

    it('allows the request when the IP is outside the deny range', async function () {
      process.env.CIDR_DENY_LIST = '10.0.0.0/8';
      const res = await makeApp({}).get('/').set('X-Forwarded-For', '192.168.1.1');
      assert.equal(res.status, 200);
    });

    it('handles newline-separated CIDRs', async function () {
      process.env.CIDR_DENY_LIST = '192.168.0.0/16\n172.16.0.0/12';
      const res = await makeApp({}).get('/').set('X-Forwarded-For', '172.20.1.1');
      assert.equal(res.status, 403);
    });

    it('handles comma-separated CIDRs', async function () {
      process.env.CIDR_DENY_LIST = '192.168.0.0/16,172.16.0.0/12';
      const res = await makeApp({}).get('/').set('X-Forwarded-For', '8.8.8.8');
      assert.equal(res.status, 200);
    });

  });

  // ── ::ffff: IPv6-mapped IPv4 normalization ────────────────────────────────────

  describe('::ffff: IPv6-mapped IPv4 normalization', function () {

    it('denies request when ::ffff:-prefixed address falls in the deny range', async function () {
      process.env.CIDR_DENY_LIST = '10.0.0.0/8';
      // Inject a ::ffff:-prefixed address directly onto req.ip before cidrDeny runs
      const app = express();
      app.use((req, res, next) => {
        Object.defineProperty(req, 'ip', { get: () => '::ffff:10.5.5.5', configurable: true });
        next();
      });
      app.use(cidrDeny({}));
      app.get('/', (req, res) => res.status(200).send('ok'));
      const res = await supertest(app).get('/');
      assert.equal(res.status, 403);
    });

    it('allows request when stripped address is outside the deny range', async function () {
      process.env.CIDR_DENY_LIST = '10.0.0.0/8';
      const app = express();
      app.use((req, res, next) => {
        Object.defineProperty(req, 'ip', { get: () => '::ffff:8.8.8.8', configurable: true });
        next();
      });
      app.use(cidrDeny({}));
      app.get('/', (req, res) => res.status(200).send('ok'));
      const res = await supertest(app).get('/');
      assert.equal(res.status, 200);
    });

  });

  // ── enabled: false ────────────────────────────────────────────────────────────

  describe('enabled: false', function () {

    it('bypasses all CIDR checks', async function () {
      process.env.CIDR_DENY_LIST = '0.0.0.0/0';
      const res = await makeApp({ enabled: false }).get('/').set('X-Forwarded-For', '1.2.3.4');
      assert.equal(res.status, 200);
    });

  });

  // ── listFile ──────────────────────────────────────────────────────────────────

  describe('listFile', function () {

    const tmpFile = '/tmp/pg-farm-test-cidr-deny.txt';

    afterEach(function () {
      if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile);
    });

    it('loads CIDRs from a file and denies a matching IP', async function () {
      fs.writeFileSync(tmpFile, '203.0.113.0/24\n');
      const res = await makeApp({ listFile: tmpFile }).get('/').set('X-Forwarded-For', '203.0.113.50');
      assert.equal(res.status, 403);
    });

    it('allows requests when the IP does not match the file list', async function () {
      fs.writeFileSync(tmpFile, '203.0.113.0/24\n');
      const res = await makeApp({ listFile: tmpFile }).get('/').set('X-Forwarded-For', '8.8.8.8');
      assert.equal(res.status, 200);
    });

    it('gracefully continues when listFile does not exist', async function () {
      const res = await makeApp({ listFile: '/tmp/nonexistent-cidr-file.txt' }).get('/');
      assert.equal(res.status, 200);
    });

  });

});
