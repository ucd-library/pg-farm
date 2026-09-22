import { assert } from 'chai';

describe('metrics-cidr-allow', function () {

  afterEach(function () {
    delete process.env.METRICS_CIDR_ALLOWLIST;
  });

  // isMetricsRequestAllowed reads process.env.METRICS_CIDR_ALLOWLIST once at module
  // load, so each scenario needs a fresh module instance via dynamic import + cache bust.
  async function loadModule() {
    const mod = await import('../../services/gateway/lib/metrics-cidr-allow.js?t='+Date.now()+Math.random());
    return mod.isMetricsRequestAllowed;
  }

  describe('no allowlist configured', function () {

    it('allows any IP', async function () {
      const isMetricsRequestAllowed = await loadModule();
      assert.isTrue(isMetricsRequestAllowed('8.8.8.8'));
    });

  });

  describe('METRICS_CIDR_ALLOWLIST env var', function () {

    it('allows an IP inside the configured range', async function () {
      process.env.METRICS_CIDR_ALLOWLIST = '10.0.0.0/8';
      const isMetricsRequestAllowed = await loadModule();
      assert.isTrue(isMetricsRequestAllowed('10.1.2.3'));
    });

    it('denies an IP outside the configured range', async function () {
      process.env.METRICS_CIDR_ALLOWLIST = '10.0.0.0/8';
      const isMetricsRequestAllowed = await loadModule();
      assert.isFalse(isMetricsRequestAllowed('192.168.1.1'));
    });

    it('handles comma-separated CIDRs', async function () {
      process.env.METRICS_CIDR_ALLOWLIST = '192.168.0.0/16,172.16.0.0/12';
      const isMetricsRequestAllowed = await loadModule();
      assert.isTrue(isMetricsRequestAllowed('172.20.1.1'));
      assert.isFalse(isMetricsRequestAllowed('8.8.8.8'));
    });

    it('handles newline-separated CIDRs', async function () {
      process.env.METRICS_CIDR_ALLOWLIST = '192.168.0.0/16\n172.16.0.0/12';
      const isMetricsRequestAllowed = await loadModule();
      assert.isTrue(isMetricsRequestAllowed('192.168.5.5'));
    });

  });

  describe('::ffff: IPv6-mapped IPv4 normalization', function () {

    it('normalizes a ::ffff:-prefixed address before checking', async function () {
      process.env.METRICS_CIDR_ALLOWLIST = '10.0.0.0/8';
      const isMetricsRequestAllowed = await loadModule();
      assert.isTrue(isMetricsRequestAllowed('::ffff:10.5.5.5'));
      assert.isFalse(isMetricsRequestAllowed('::ffff:8.8.8.8'));
    });

  });

});
