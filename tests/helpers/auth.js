import sinon from 'sinon';
import keycloak from '../../services/lib/keycloak.js';

/**
 * Pre-built test user objects for each role.
 * These are injected directly into req.user — no real JWT/OIDC involved.
 * keycloak.setUser short-circuits when req.user is already set.
 */
export const users = {
  /** System administrator — passes keycloak._protectAdmin */
  admin: {
    username: 'test-admin',
    preferred_username: 'test-admin',
    roles: ['admin', 'test-admin'],
  },

  /** Organization admin for 'test-org' — passes keycloak._protectOrganization */
  orgAdmin: {
    username: 'test-org-admin',
    preferred_username: 'test-org-admin',
    roles: ['test-org-admin'],
  },

  /** Regular authenticated user */
  user: {
    username: 'test-user',
    preferred_username: 'test-user',
    roles: ['test-user'],
  },

  /** Anonymous — no user set on request */
  anonymous: null,
};

/**
 * @function stubKeycloak
 * @description Stub keycloak.verifyActiveToken so tests never hit JWKS/Keycloak.
 * The stub decodes our test token format: a JSON-stringified user object.
 * Call this once in a root before() hook.
 *
 * @returns {sinon.SinonStub}
 */
export function stubKeycloak() {
  if (keycloak.verifyActiveToken.restore) return; // already stubbed

  sinon.stub(keycloak, 'verifyActiveToken').callsFake(async (token) => {
    if (!token) return { active: false, user: null };
    try {
      const user = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
      return { active: true, user, jwt: token };
    } catch {
      return { active: false, user: null };
    }
  });
}

/**
 * @function restoreKeycloak
 * @description Restore the keycloak stub. Call in a root after() hook.
 */
export function restoreKeycloak() {
  if (keycloak.verifyActiveToken.restore) {
    keycloak.verifyActiveToken.restore();
  }
}

/**
 * @function tokenFor
 * @description Encode a user object as a base64 test token.
 * Pass to the Authorization header: `Bearer ${tokenFor(users.admin)}`.
 *
 * @param {Object} user  One of the user objects from users above
 * @returns {String}
 */
export function tokenFor(user) {
  return Buffer.from(JSON.stringify(user)).toString('base64');
}

/**
 * @function authHeader
 * @description Returns the Authorization header value for a test user.
 *
 * @param {Object} user  One of the user objects from users above
 * @returns {String}
 */
export function authHeader(user) {
  return `Bearer ${tokenFor(user)}`;
}
