/**
 * Environment overrides for CLI-driven E2E tests against a local Docker Desktop
 * kubernetes cluster.  Loaded by .mocharc.e2e.local.yml.
 *
 * Prerequisites:
 *   - Docker Desktop k8s enabled
 *   - pgfarm stack running (docker compose up)
 */

process.env.PGFARM_HOST = process.env.PGFARM_HOST || 'http://localhost:30000';

// Namespace where pgfarm deploys instances on the local cluster
process.env.E2E_K8S_NAMESPACE = process.env.E2E_K8S_NAMESPACE || 'pg-farm';

// pgfarm admin database connection (port-forwarded locally)
process.env.E2E_ADMIN_DB_HOST     = process.env.E2E_ADMIN_DB_HOST     || 'localhost';
process.env.E2E_ADMIN_DB_PORT     = process.env.E2E_ADMIN_DB_PORT     || '30544';
process.env.E2E_ADMIN_DB_USER     = process.env.E2E_ADMIN_DB_USER     || 'postgres';
process.env.E2E_ADMIN_DB_PASSWORD = process.env.E2E_ADMIN_DB_PASSWORD || 'postgres';
process.env.E2E_ADMIN_DB_NAME     = process.env.E2E_ADMIN_DB_NAME     || 'postgres';
