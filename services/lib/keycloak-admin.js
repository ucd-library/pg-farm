import config from './config.js';
import logger from './logger.js';

/**
 * @description Derives the Keycloak admin REST API base URL from the OIDC base URL.
 * e.g. https://auth.example.com/realms/pg-farm → https://auth.example.com/admin/realms/pg-farm
 * @returns {string}
 */
function getAdminBaseUrl() {
  return config.oidc.baseUrl.replace('/realms/', '/admin/realms/');
}

class KeycloakAdmin {

  constructor() {
    this._adminToken = null;
    this._adminTokenExpires = 0;
  }

  /**
   * @method getAdminToken
   * @description Obtains a short-lived admin token via client credentials grant, using the
   * configured KEYCLOAK_ADMIN_CLIENT_ID / KEYCLOAK_ADMIN_SECRET. Result is cached until 30s
   * before expiry.
   *
   * @returns {Promise<string>} Bearer token string
   */
  async getAdminToken() {
    if( this._adminToken && Date.now() < this._adminTokenExpires ) {
      return this._adminToken;
    }

    const tokenUrl = config.oidc.baseUrl + '/protocol/openid-connect/token';

    const resp = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type   : 'client_credentials',
        client_id    : config.oidc.adminClientId,
        client_secret: config.oidc.adminSecret
      })
    });

    if( !resp.ok ) {
      const text = await resp.text();
      throw new Error(`Failed to obtain Keycloak admin token (${resp.status}): ${text}`);
    }

    const body = await resp.json();
    this._adminToken = body.access_token;
    // cache until 30s before real expiry
    this._adminTokenExpires = Date.now() + (body.expires_in - 30) * 1000;

    return this._adminToken;
  }

  /**
   * @method getUser
   * @description Looks up a Keycloak user by exact username and returns the full user object
   * (including attributes), or null if not found.
   *
   * @param {string} username
   * @returns {Promise<Object|null>}
   */
  async getUser(username) {
    const token = await this.getAdminToken();
    const url = `${getAdminBaseUrl()}/users?username=${encodeURIComponent(username)}&exact=true`;

    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if( !resp.ok ) {
      const text = await resp.text();
      throw new Error(`Keycloak user lookup failed (${resp.status}): ${text}`);
    }

    const users = await resp.json();
    return users.length ? users[0] : null;
  }

  /**
   * @method getUserId
   * @description Looks up a Keycloak user by exact username and returns the internal Keycloak user ID.
   *
   * @param {string} username
   * @returns {Promise<string|null>} Keycloak user UUID, or null if not found
   */
  async getUserId(username) {
    const user = await this.getUser(username);
    return user ? user.id : null;
  }

  /**
   * @method createUser
   * @description Creates a new standard Keycloak user with the given username, password, and
   * attributes. The user is created with emailVerified=true and no required actions so they can
   * authenticate immediately via password grant.
   *
   * @param {string} username
   * @param {string} password
   * @param {Object} [opts={}]
   * @param {Object} [opts.attributes={}] - additional Keycloak user attributes (values must be strings)
   * @returns {Promise<void>}
   */
  async createUser(username, password, opts={}) {
    const token = await this.getAdminToken();

    logger.info('Creating Keycloak user', username);

    // Keycloak attribute values are always arrays of strings
    const attributes = {};
    for( const [k, v] of Object.entries(opts.attributes || {}) ) {
      attributes[k] = [String(v)];
    }

    const resp = await fetch(`${getAdminBaseUrl()}/users`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username,
        enabled        : true,
        emailVerified  : true,
        requiredActions: [],
        attributes,
        credentials    : [{
          type     : 'password',
          value    : password,
          temporary: false
        }]
      })
    });

    if( !resp.ok ) {
      const text = await resp.text();
      throw new Error(`Failed to create Keycloak user "${username}" (${resp.status}): ${text}`);
    }
  }

  /**
   * @method updateUserPassword
   * @description Resets the password for an existing Keycloak user.
   *
   * @param {string} username
   * @param {string} newPassword
   * @returns {Promise<void>}
   */
  async updateUserPassword(username, newPassword) {
    const userId = await this.getUserId(username);
    if( !userId ) {
      throw new Error(`Keycloak user not found: ${username}`);
    }

    const token = await this.getAdminToken();

    logger.info('Updating Keycloak user password', username);

    const resp = await fetch(`${getAdminBaseUrl()}/users/${userId}/reset-password`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type     : 'password',
        value    : newPassword,
        temporary: false
      })
    });

    if( !resp.ok ) {
      const text = await resp.text();
      throw new Error(`Failed to update Keycloak password for "${username}" (${resp.status}): ${text}`);
    }
  }

  /**
   * @method deleteUser
   * @description Removes a user from Keycloak.
   *
   * @param {string} username
   * @returns {Promise<void>}
   */
  async deleteUser(username) {
    const userId = await this.getUserId(username);
    if( !userId ) return;

    const token = await this.getAdminToken();

    logger.info('Deleting Keycloak user', username);

    const resp = await fetch(`${getAdminBaseUrl()}/users/${userId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` }
    });

    if( !resp.ok ) {
      const text = await resp.text();
      throw new Error(`Failed to delete Keycloak user "${username}" (${resp.status}): ${text}`);
    }
  }

}

const instance = new KeycloakAdmin();
export default instance;
