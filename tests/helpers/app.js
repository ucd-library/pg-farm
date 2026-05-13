import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import supertest from 'supertest';
import keycloak from '../../services/lib/keycloak.js';
import { stubKeycloak, tokenFor } from './auth.js';

// Stub before importing any controller that uses keycloak
stubKeycloak();

// Dynamic import so the stub is in place before the router module executes
const { default: apiRouter } = await import('../../services/administration/src/controllers/api.js');

/**
 * @function createApp
 * @description Build a minimal Express app with the API router and optional
 * pre-authenticated test user.  Does NOT call app.listen() — use with supertest.
 *
 * @param {Object|null} testUser  A user object from helpers/auth.js#users, or null for anonymous
 * @returns {express.Application}
 */
export function createApp(testUser = null) {
  const app = express();
  app.use(cookieParser());
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));

  // Inject test user before keycloak.setUser so it short-circuits OIDC verification
  if (testUser) {
    app.use((req, _res, next) => {
      req.user = testUser;
      next();
    });
  }

  // setUser still runs but skips OIDC since req.user is already set (or verifyActiveToken is stubbed)
  app.use(keycloak.setUser);

  app.use('/api', apiRouter);

  return app;
}

/**
 * @function request
 * @description Returns a supertest agent pre-configured with an authenticated
 * test user.  Pass a user from helpers/auth.js#users.
 *
 * @param {Object|null} testUser
 * @returns {supertest.SuperTest}
 */
export function request(testUser = null) {
  const app = createApp(testUser);
  return supertest(app);
}

/**
 * @function authedRequest
 * @description Returns a supertest agent that sends the test user as a Bearer token
 * (goes through keycloak.verifyActiveToken stub rather than req.user injection).
 * Useful for testing the token-reading path specifically.
 *
 * @param {Object} user
 * @returns {supertest.SuperTest}
 */
export function authedRequest(user) {
  const app = createApp(null);
  const agent = supertest(app);
  const token = tokenFor(user);

  // Return a proxy that auto-attaches the Authorization header
  return new Proxy(agent, {
    get(target, method) {
      if (['get', 'post', 'put', 'patch', 'delete'].includes(method)) {
        return (url) => target[method](url).set('Authorization', `Bearer ${token}`);
      }
      return target[method];
    }
  });
}
