/**
 * Overrides set on top of env.cjs specifically for E2E tests.
 * This file must be --require'd AFTER helpers/env.cjs so that it
 * wins over the defaults set there.
 *
 * Loaded by .mocharc.e2e.yml — NOT by .mocharc.yml.
 */

// Enable real K8s (env.cjs disables it)
process.env.K8S_DISABLED = 'false';
process.env.K8S_PLATFORM = 'docker-desktop';

// Postgres instance image — the same one currently running in the pg-farm namespace.
// env.cjs sets placeholder values; we always override here.
// Supply PG_INSTANCE_IMAGE_E2E to use a different registry image.
process.env.PG_INSTANCE_IMAGE =
  process.env.PG_INSTANCE_IMAGE_E2E ||
  'us-west1-docker.pkg.dev/digital-ucdavis-edu/jm-dev/postgres:16';

// pg-helper sidecar image.
// Supply BASE_IMAGE_E2E to use a different registry image.
process.env.BASE_IMAGE =
  process.env.BASE_IMAGE_E2E ||
  'us-west1-docker.pkg.dev/digital-ucdavis-edu/jm-dev/pgfarm-service:local-dev';
