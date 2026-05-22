import crypto from 'crypto';
import client from '../lib/pg-admin-client.js';
import keycloakAdmin from '../lib/keycloak-admin.js';
import logger from '../lib/logger.js';

const SERVICE_ACCOUNT_SUFFIX = '-service-account';

class ServiceAccountModel {

  /**
   * @method ensureSuffix
   * @description Ensures the username ends with '-service-account', appending it if needed.
   *
   * @param {string} name
   * @returns {string}
   */
  ensureSuffix(name) {
    if( name.endsWith(SERVICE_ACCOUNT_SUFFIX) ) return name;
    return name + SERVICE_ACCOUNT_SUFFIX;
  }

  /**
   * @method generatePassword
   * @description Generates a cryptographically random 512-character base64 password.
   * 384 bytes of entropy → exactly 512 base64 characters (no padding).
   *
   * @returns {string}
   */
  generatePassword() {
    return crypto.randomBytes(384).toString('base64');
  }

  /**
   * @method create
   * @description Creates a new service account: generates a password, registers the user in
   * Keycloak with the required attributes, and records the parent relationship in the pgfarm
   * admin DB. The password is returned once and never stored — the caller is responsible for
   * saving it.
   *
   * @param {string} parentUsername - pgfarm username of the owning user
   * @param {string} name - desired service account name (suffix appended if missing)
   * @param {string} description - human-readable description of the service account's purpose
   * @returns {Promise<{username: string, secret: string}>}
   */
  async create(parentUsername, name, description) {
    const username = this.ensureSuffix(name);
    const secret = this.generatePassword();

    logger.info('Creating service account', username, 'for parent', parentUsername);

    await keycloakAdmin.createUser(username, secret, {
      attributes: {
        'service-account': 'true',
        description
      }
    });

    try {
      await client.createServiceAccount(username, parentUsername);
    } catch(e) {
      // Keycloak user was created — attempt cleanup before re-throwing
      logger.error('Failed to record service account in DB, attempting Keycloak rollback', username, e);
      try {
        await keycloakAdmin.deleteUser(username);
      } catch(cleanupErr) {
        logger.error('Keycloak rollback failed for', username, cleanupErr);
      }
      throw e;
    }

    return { username, secret };
  }

  /**
   * @method rotatePassword
   * @description Generates a new password and updates the Keycloak credential. Only the
   * parent user or a system admin may rotate. The new password is returned once and never
   * stored.
   *
   * @param {string} serviceAccountName - service account name (suffix appended if missing)
   * @param {string} requestingUsername - username of the caller
   * @param {Object} opts
   * @param {boolean} [opts.isAdmin=false] - bypass parent ownership check
   * @returns {Promise<{username: string, secret: string}>}
   */
  async rotatePassword(serviceAccountName, requestingUsername, opts={}) {
    const username = this.ensureSuffix(serviceAccountName);

    if( !opts.isAdmin ) {
      const parent = await client.getServiceAccountParent(username);
      if( parent !== requestingUsername ) {
        throw new Error('Unauthorized: you are not the parent of this service account');
      }
    }

    const secret = this.generatePassword();

    logger.info('Rotating password for service account', username);

    await keycloakAdmin.updateUserPassword(username, secret);
    const lastRotatedAt = await client.updateServiceAccountRotatedAt(username);

    return { username, secret, lastRotatedAt };
  }

  /**
   * @method getForUser
   * @description Returns all service accounts owned by the given user, including the
   * description attribute fetched from Keycloak. Keycloak errors are caught and logged so
   * a Keycloak outage does not prevent the list from being returned.
   *
   * @param {string} parentUsername
   * @returns {Promise<Array<{username: string, description: string|null, lastRotatedAt: Date|null, createdAt: Date}>>}
   */
  async getForUser(parentUsername) {
    const rows = await client.getServiceAccountsForUser(parentUsername);

    return Promise.all(rows.map(async row => {
      let description = null;
      try {
        const kcUser = await keycloakAdmin.getUser(row.username);
        description = kcUser?.attributes?.description?.[0] ?? null;
      } catch(e) {
        logger.warn('Failed to fetch Keycloak attributes for service account', row.username, e.message);
      }

      return {
        username      : row.username,
        description,
        lastRotatedAt : row.last_rotated_at || null,
        createdAt     : row.created_at
      };
    }));
  }

}

const instance = new ServiceAccountModel();
export default instance;
