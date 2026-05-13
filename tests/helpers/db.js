import { execSync, exec } from 'child_process';
import { promisify } from 'util';
import { readFileSync, readdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import PG from 'pg';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const COMPOSE_FILE = path.join(__dirname, 'compose.test.yml');
const SCHEMA_DIR = path.join(__dirname, '../../services/administration/schema');

const PG_CONFIG = {
  host: 'localhost',
  port: 15432,
  user: 'postgres',
  password: 'postgres',
  database: 'postgres',
};

let pool = null;

/**
 * @function getPool
 * @description Returns a pg connection pool for direct test queries (fixtures, assertions).
 * Separate from the service's singleton pg-admin-client pool.
 *
 * @returns {PG.Pool}
 */
function getPool() {
  if (!pool) {
    pool = new PG.Pool(PG_CONFIG);
  }
  return pool;
}

/**
 * @function query
 * @description Run a SQL query against the test admin DB directly.
 *
 * @param {String} sql
 * @param {Array} params
 * @returns {Promise<Object>}
 */
export function query(sql, params) {
  return getPool().query(sql, params);
}

/**
 * @function waitForDb
 * @description Poll until the test postgres container accepts connections.
 *
 * @param {Number} maxAttempts
 * @returns {Promise<void>}
 */
async function waitForDb(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const client = new PG.Client(PG_CONFIG);
      await client.connect();
      await client.end();
      return;
    } catch (e) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }
  throw new Error('Test postgres container did not become ready in time');
}

/**
 * @function applySchema
 * @description Run all schema SQL files in order against the test DB.
 *
 * @returns {Promise<void>}
 */
async function applySchema() {
  const files = readdirSync(SCHEMA_DIR)
    .filter(f => f.endsWith('.sql'))
    .sort();

  const client = new PG.Client(PG_CONFIG);
  await client.connect();

  for (const file of files) {
    const sql = readFileSync(path.join(SCHEMA_DIR, file), 'utf-8');
    await client.query(sql);
  }

  await client.end();
}

/**
 * @function start
 * @description Start the test postgres container and apply the admin schema.
 * Call from a root mocha before() hook.
 *
 * @returns {Promise<void>}
 */
export async function start() {
  execSync(`docker compose -f ${COMPOSE_FILE} up -d`, { stdio: 'pipe' });
  await waitForDb();
  await applySchema();
}

/**
 * @function stop
 * @description Stop and remove the test postgres container.
 * Call from a root mocha after() hook.
 *
 * @returns {Promise<void>}
 */
export async function stop() {
  if (pool) {
    await pool.end();
    pool = null;
  }
  execSync(`docker compose -f ${COMPOSE_FILE} down -v`, { stdio: 'pipe' });
}

/**
 * @function reset
 * @description Truncate all pgfarm tables to give each test file a clean slate.
 * Preserves schema/functions/types — only removes rows.
 *
 * @returns {Promise<void>}
 */
export async function reset() {
  await query(`
    TRUNCATE pgfarm.database_featured,
             pgfarm.database_last_event,
             pgfarm.connection_event,
             pgfarm.connection,
             pgfarm.instance_state_history,
             pgfarm.instance_user,
             pgfarm.k8s_config_property,
             pgfarm.pg_rest_config,
             pgfarm.database,
             pgfarm.instance,
             pgfarm.user_email,
             pgfarm.user_token,
             pgfarm.user,
             pgfarm.organization_role,
             pgfarm.organization,
             pgfarm.hostname
    RESTART IDENTITY CASCADE
  `);
}
