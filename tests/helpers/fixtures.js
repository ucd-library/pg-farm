import { query } from './db.js';

/**
 * @function createOrg
 * @description Insert a test organization directly into the admin DB.
 *
 * @param {Object} opts
 * @param {String} opts.name  Short unique name
 * @param {String} opts.title Human-readable title
 * @returns {Promise<Object>} Created organization row
 */
export async function createOrg(opts = {}) {
  const name = opts.name || `test-org-${Date.now()}`;
  const title = opts.title || `Test Org ${name}`;
  const resp = await query(
    `INSERT INTO pgfarm.organization (name, title, description, url)
     VALUES ($1, $2, $3, $4) RETURNING *`,
    [name, title, opts.description || null, opts.url || null]
  );
  return resp.rows[0];
}

/**
 * @function deleteOrg
 * @description Remove a test organization (cascades to instances/databases).
 *
 * @param {String} name
 * @returns {Promise<void>}
 */
export async function deleteOrg(name) {
  await query(`DELETE FROM pgfarm.organization WHERE name = $1`, [name]);
}

/**
 * @function createInstance
 * @description Insert a test instance into the admin DB.
 *
 * @param {String} orgName  Parent organization name
 * @param {Object} opts
 * @param {String} opts.name      Short unique name
 * @param {String} opts.hostname  Hostname (defaults to name)
 * @param {String} opts.state     Instance state (default RUN)
 * @returns {Promise<Object>} Created instance row
 */
export async function createInstance(orgName, opts = {}) {
  const name = opts.name || `test-inst-${Date.now()}`;
  const hostname = opts.hostname || name;
  const state = opts.state || 'RUN';
  const resp = await query(
    `INSERT INTO pgfarm.instance (name, hostname, description, organization_id, state)
     VALUES ($1, $2, $3, pgfarm.get_organization_id($4), $5) RETURNING *`,
    [name, hostname, opts.description || null, orgName, state]
  );
  return resp.rows[0];
}

/**
 * @function createDatabase
 * @description Insert a test database into the admin DB.
 *
 * @param {String} orgName   Parent organization name
 * @param {String} instName  Parent instance name
 * @param {Object} opts
 * @param {String} opts.name  Short unique name
 * @returns {Promise<Object>} Created database row
 */
export async function createDatabase(orgName, instName, opts = {}) {
  const name = opts.name || `test-db-${Date.now()}`;
  const resp = await query(
    `INSERT INTO pgfarm.database (name, title, instance_id, organization_id, pgrest_hostname, short_description)
     VALUES ($1, $2, pgfarm.get_instance_id($3, $4), pgfarm.get_organization_id($4), $5, $6)
     RETURNING *`,
    [name, opts.title || name, instName, orgName,
     opts.pgrest_hostname || name+'.pgrest.test', opts.short_description || null]
  );
  return resp.rows[0];
}

/**
 * @function createUser
 * @description Insert a test pgfarm user.
 *
 * @param {Object} opts
 * @param {String} opts.username
 * @returns {Promise<Object>}
 */
export async function createUser(opts = {}) {
  const username = opts.username || `test-user-${Date.now()}`;
  const resp = await query(
    `INSERT INTO pgfarm.user (username) VALUES ($1)
     ON CONFLICT (username) DO UPDATE SET username = EXCLUDED.username
     RETURNING *`,
    [username]
  );
  return resp.rows[0];
}

/**
 * @function createInstanceUser
 * @description Add a user to an instance via the add_instance_user stored procedure.
 * Also creates the pgfarm.user record if it does not exist.
 *
 * @param {String} orgName   Parent organization name
 * @param {String} instName  Parent instance name
 * @param {Object} opts
 * @param {String} opts.username
 * @param {String} opts.type   USER, ADMIN, PGREST, SERVICE_ACCOUNT (default USER)
 * @param {String} opts.password
 * @param {String} opts.parent parent username for SERVICE_ACCOUNT type
 * @returns {Promise<String>} instance_user_id UUID
 */
export async function createInstanceUser(orgName, instName, opts = {}) {
  const username = opts.username || `test-user-${Date.now()}`;
  const type = opts.type || 'USER';
  const password = opts.password || 'test-password-123';
  const resp = await query(
    `SELECT pgfarm.add_instance_user($1, $2, $3, $4, $5::pgfarm.instance_user_type, $6) AS instance_user_id`,
    [instName, orgName, username, password, type, opts.parent || null]
  );
  return { instance_user_id: resp.rows[0].instance_user_id, username, type, password };
}
