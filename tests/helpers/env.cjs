/**
 * Loaded via mocha --require before any ESM module imports.
 * Sets all env vars that config.js reads at module load time.
 */

// Required by config.js to avoid throwing on startup
process.env.PG_INSTANCE_IMAGE = 'test-image:latest';
process.env.BASE_IMAGE = 'test-image:latest';

// Admin DB — test postgres container on fixed port 15432
process.env.PG_HOST = 'localhost';
process.env.PG_PORT = '15432';
process.env.PG_USERNAME = 'postgres';
process.env.PG_PASSWORD = 'postgres';
process.env.PG_DATABASE = 'postgres';
process.env.PG_SCHEMA = 'pgfarm';

// Disable K8s so no kubectl calls happen
process.env.K8S_DISABLED = 'true';

// JWT — symmetric secret used by auth helper to sign test tokens
process.env.JWT_SECRET = 'pg-farm-test-secret-do-not-use-in-prod';

// Keep logs quiet during tests
process.env.LOG_LEVEL = 'error';

// Disable metrics and backup side-effects
process.env.METRICS_ENABLED = 'false';
process.env.AUTO_BACKUP_ENABLED = 'false';

// Prevent config.js from trying to read GCP credentials
process.env.GOOGLE_APPLICATION_CREDENTIALS = '';

// OIDC — not used in tests (keycloak.verifyActiveToken is stubbed)
process.env.OIDC_BASE_URL = 'http://localhost:9999/realms/test';
process.env.OIDC_CLIENT_ID = 'test-client';
process.env.OIDC_SECRET = 'test-secret';

// IconLoader paths — override Docker container defaults so icon routes load in local test env
const path = require('path');
const servicesRoot = path.resolve(__dirname, '../../services');
process.env.FA_NODE_MODULE_PATH = path.join(servicesRoot, 'node_modules/@fortawesome/fontawesome-free');
process.env.FA_CUSTOM_ICON_PATH = path.join(servicesRoot, 'administration/src/controllers/api/icon/svgs');
