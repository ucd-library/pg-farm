import { start, stop } from './db.js';
import { stubKeycloak, restoreKeycloak } from './auth.js';
import { setupNamespace, teardownNamespace } from './k8s.js';

/**
 * Root-level mocha hooks for the E2E suite.
 * Loaded via --file in .mocharc.e2e.yml.
 * Starts the test admin-DB container AND sets up the pgfarm-test K8s namespace.
 */

before(async function () {
  this.timeout(120000);
  stubKeycloak();
  await start();
  await setupNamespace();
});

after(async function () {
  this.timeout(60000);
  restoreKeycloak();
  await stop();
  await teardownNamespace();
});
