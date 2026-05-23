import fs from 'fs';
import path from 'path';
import os from 'os';
import pg from 'pg';

/**
 * Verify that the user is currently logged in to pgfarm and the token has not
 * expired.  Exits the process with a clear, actionable error if not so the
 * test run fails immediately rather than with cryptic auth errors mid-suite.
 *
 * @returns {void}
 */
export function checkAuth() {
  const configFile = process.env.PGFARM_CONF_FILE || path.join(os.homedir(), '.pg-farm.json');

  if (!fs.existsSync(configFile)) {
    console.error('\n  Error: pgfarm config not found. Run: pgfarm auth login\n');
    process.exit(1);
  }

  let cfg;
  try {
    cfg = JSON.parse(fs.readFileSync(configFile, 'utf8'));
  } catch (_) {
    console.error('\n  Error: pgfarm config is not valid JSON. Run: pgfarm auth login\n');
    process.exit(1);
  }

  if (!cfg.token) {
    console.error('\n  Error: Not logged in to pgfarm. Run: pgfarm auth login\n');
    process.exit(1);
  }

  let payload;
  try {
    payload = JSON.parse(Buffer.from(cfg.token.split('.')[1], 'base64').toString('utf8'));
  } catch (_) {
    console.error('\n  Error: Could not parse pgfarm token. Run: pgfarm auth login\n');
    process.exit(1);
  }

  if (payload.exp && payload.exp * 1000 < Date.now()) {
    console.error('\n  Error: pgfarm token has expired. Run: pgfarm auth login\n');
    process.exit(1);
  }

  const username = payload.username || payload.preferred_username || '(unknown)';
  console.log(`  Authenticated as: ${username}`);
  console.log(`  Target host:      ${process.env.PGFARM_HOST}`);
}

/**
 * Return the pgfarm admin DB connection config from env vars.
 *
 * @returns {Object} pg connection config
 */
export function getAdminDbConfig() {
  return {
    host     : process.env.E2E_ADMIN_DB_HOST     || 'localhost',
    port     : parseInt(process.env.E2E_ADMIN_DB_PORT || '30544'),
    user     : process.env.E2E_ADMIN_DB_USER     || 'postgres',
    password : process.env.E2E_ADMIN_DB_PASSWORD || 'postgres',
    database : process.env.E2E_ADMIN_DB_NAME     || 'postgres',
  };
}

/**
 * Verify the pgfarm admin database is reachable on the configured port.
 * Exits the process with a clear, actionable error if not.
 *
 * @returns {Promise<void>}
 */
export async function checkAdminDb() {
  const cfg = getAdminDbConfig();
  const client = new pg.Client({ ...cfg, connectionTimeoutMillis: 5000 });

  try {
    await client.connect();
    await client.end();
    console.log(`  Admin DB:         ${cfg.host}:${cfg.port}`);
  } catch (err) {
    console.error(`\n  Error: Cannot connect to pgfarm admin DB at ${cfg.host}:${cfg.port}`);
    console.error(`  ${err.message}`);
    console.error('  Ensure the admin DB port-forward is active. See tests/README.md\n');
    process.exit(1);
  }
}
