import { checkGkeContext } from './k8s.js';
import { checkAuth, checkAdminDb } from './e2e-setup.js';

/**
 * Root-level mocha hooks for the CLI-driven E2E suite running against a local
 * Docker Desktop kubernetes cluster.  Loaded via --file in .mocharc.e2e.local.yml.
 *
 * Prerequisites:
 *   - kubectl context pointing at docker-desktop
 *   - pgfarm CLI logged in (pgfarm auth login)
 *   - pgfarm stack running locally
 *   - PGFARM_HOST=http://localhost:30000
 *   - Admin DB port-forward active on E2E_ADMIN_DB_PORT (default 30544)
 */

before(async function () {
  this.timeout(30000);
  console.log('\nSetting up CLI E2E test environment (local docker-desktop)...\n');
  await checkGkeContext('docker-desktop');
  console.log('  kubectl context: docker-desktop\n');
  checkAuth();
  await checkAdminDb();
  console.log('\nE2E environment ready\n');
});
