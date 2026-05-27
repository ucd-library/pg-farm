/**
 * Environment overrides for running E2E tests against the GKE dev cluster (pgfarm-dev).
 * Loaded by .mocharc.e2e.gke-dev.yml after helpers/env.cjs.
 *
 * Prerequisites:
 *   cork-kube init dev   — configures gcloud and kubectl for the dev cluster
 *   pgfarm auth login    — logged in to dev.pgfarm.library.ucdavis.edu
 */

process.env.PGFARM_HOST = process.env.PGFARM_HOST || 'https://dev.pgfarm.library.ucdavis.edu';

// Namespace where pgfarm deploys instances on the dev cluster
process.env.E2E_K8S_NAMESPACE = process.env.E2E_K8S_NAMESPACE || 'pg-farm';

process.env.K8S_DISABLED = 'false';
process.env.K8S_PLATFORM = 'gke';
process.env.K8S_CLUSTER  = 'pgfarm-dev';
process.env.GKE_ZONE     = 'us-central1-c';
process.env.GC_PROJECT_ID = 'pgfarm-419213';

// Service account secret lives in the 'default' namespace on the dev cluster
process.env.E2E_SOURCE_NAMESPACE = 'default';

// Postgres instance image published to the shared dev registry.
// Override with PG_INSTANCE_IMAGE_E2E to test a different image.
process.env.PG_INSTANCE_IMAGE =
  process.env.PG_INSTANCE_IMAGE_E2E ||
  'us-west1-docker.pkg.dev/digital-ucdavis-edu/pub/postgres:16';

// pg-helper / pgfarm-service image.
// Override with BASE_IMAGE_E2E to test a different tag.
process.env.BASE_IMAGE =
  process.env.BASE_IMAGE_E2E ||
  'us-docker.pkg.dev/pgfarm-419213/containers/pgfarm-service:0.7.5';
