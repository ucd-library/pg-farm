import { assert } from 'chai';
import sinon from 'sinon';
import express from 'express';
import bodyParser from 'body-parser';
import supertest from 'supertest';
import keycloak from '../../services/lib/keycloak.js';
import pgAdminClient from '../../services/lib/pg-admin-client.js';
import { reset } from '../helpers/db.js';

// Dynamic import so the keycloak stub from helpers/app.js is already in place
// before the auth controller registers its routes.
const { default: authController } = await import('../../services/administration/src/controllers/auth/index.js');

/**
 * @function createAuthApp
 * @description Build a minimal Express app that includes only the auth routes.
 * Does NOT call app.listen() — intended for use with supertest.
 *
 * @returns {express.Application}
 */
function createAuthApp() {
  const app = express();
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: false }));
  authController.register(app);
  return app;
}

const MOCK_TOKEN_1 = 'first.mock.token';
const MOCK_TOKEN_2 = 'second.mock.token';

/**
 * @function mockLoginResp
 * @description Build a stub keycloak login response.
 *
 * @param {Object} opts
 * @param {string} opts.token
 * @param {boolean} opts.includeIdToken
 * @returns {Object}
 */
function mockLoginResp({ token = MOCK_TOKEN_1, includeIdToken = true } = {}) {
  const body = {
    access_token: token,
    expires_in: 604800,
    token_type: 'Bearer',
  };
  if (includeIdToken) body.id_token = 'id-token-should-be-stripped';
  return { status: 200, body };
}

describe('service account auth API', function () {

  before(async function () {
    await reset();
  });

  after(async function () {
    await reset();
  });

  beforeEach(function () {
    sinon.stub(keycloak, 'loginServiceAccount').resolves(mockLoginResp());
    sinon.stub(pgAdminClient, 'setUserToken').resolves('mock-token-hash');
  });

  afterEach(function () {
    sinon.restore();
  });

  // ── POST /auth/service-account/login ─────────────────────────────────────

  describe('POST /auth/service-account/login', function () {

    it('returns 200 with access_token on valid credentials', async function () {
      const res = await supertest(createAuthApp())
        .post('/auth/service-account/login')
        .send({ username: 'svc-user', secret: 'svc-secret' });

      assert.equal(res.status, 200);
      assert.equal(res.body.access_token, MOCK_TOKEN_1);
    });

    it('strips id_token from the response', async function () {
      const res = await supertest(createAuthApp())
        .post('/auth/service-account/login')
        .send({ username: 'svc-user', secret: 'svc-secret' });

      assert.equal(res.status, 200);
      assert.notProperty(res.body, 'id_token', 'id_token must not be forwarded to clients');
    });

    it('passes username and secret to loginServiceAccount', async function () {
      await supertest(createAuthApp())
        .post('/auth/service-account/login')
        .send({ username: 'svc-user', secret: 'super-secret-value' });

      const stub = keycloak.loginServiceAccount;
      assert.isTrue(stub.calledOnce);
      assert.equal(stub.firstCall.args[0], 'svc-user');
      assert.equal(stub.firstCall.args[1], 'super-secret-value');
    });

    it('returns 400 when keycloak returns no access_token', async function () {
      keycloak.loginServiceAccount.resolves({ status: 401, body: { error: 'invalid_grant' } });

      const res = await supertest(createAuthApp())
        .post('/auth/service-account/login')
        .send({ username: 'svc-user', secret: 'wrong-secret' });

      assert.equal(res.status, 400);
      assert.property(res.body, 'error');
    });

    it('returns 500 when keycloak returns an error body despite 200 status', async function () {
      keycloak.loginServiceAccount.resolves({
        status: 200,
        body: { access_token: MOCK_TOKEN_1, error: 'account_disabled' },
      });

      const res = await supertest(createAuthApp())
        .post('/auth/service-account/login')
        .send({ username: 'svc-user', secret: 'svc-secret' });

      assert.equal(res.status, 500);
    });

  });

  // ── Token rotation ────────────────────────────────────────────────────────

  describe('token rotation', function () {

    it('successive calls with the same credentials return independent tokens', async function () {
      keycloak.loginServiceAccount
        .onFirstCall().resolves(mockLoginResp({ token: MOCK_TOKEN_1 }))
        .onSecondCall().resolves(mockLoginResp({ token: MOCK_TOKEN_2 }));

      const app = createAuthApp();

      const res1 = await supertest(app)
        .post('/auth/service-account/login')
        .send({ username: 'svc-user', secret: 'svc-secret' });

      const res2 = await supertest(app)
        .post('/auth/service-account/login')
        .send({ username: 'svc-user', secret: 'svc-secret' });

      assert.equal(res1.status, 200);
      assert.equal(res2.status, 200);
      assert.equal(res1.body.access_token, MOCK_TOKEN_1);
      assert.equal(res2.body.access_token, MOCK_TOKEN_2);
      assert.notEqual(res1.body.access_token, res2.body.access_token,
        'each rotation call must return a distinct token');
    });

    it('rotation response includes expires_in so the caller can schedule the next refresh', async function () {
      const res = await supertest(createAuthApp())
        .post('/auth/service-account/login')
        .send({ username: 'svc-user', secret: 'svc-secret' });

      assert.equal(res.status, 200);
      assert.isNumber(res.body.expires_in, 'expires_in must be present for rotation scheduling');
      assert.isAbove(res.body.expires_in, 0);
    });

  });

});
