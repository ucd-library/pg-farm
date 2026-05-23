import { checkGkeContext } from './k8s.js';
import { checkAuth, checkAdminDb } from './e2e-setup.js';

/**
 * Root-level mocha hooks for the CLI-driven E2E suite running against the GKE
 * dev cluster.  Loaded via --file in .mocharc.e2e.gke-dev.yml.
 *
 * Prerequisites:
 *   - cork-kube init dev  (sets kubectl context to the pgfarm-dev GKE cluster)
 *   - pgfarm auth login   (or already logged in with a valid token)
 *   - PGFARM_HOST=https://dev.pgfarm.library.ucdavis.edu
 */

before(async function () {
  this.timeout(30000);
  console.log('\nSetting up CLI E2E test environment (GKE dev cluster)...\n');
  await checkGkeContext('gke_pgfarm-419213_us-central1-c_pgfarm-dev');
  console.log('  kubectl context: gke_pgfarm-419213_us-central1-c_pgfarm-dev\n');
  checkAuth();
  await checkAdminDb();
  console.log('\nE2E environment ready\n');
});
