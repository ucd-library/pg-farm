import { assert } from 'chai';
import sinon from 'sinon';
import express from 'express';
import supertest from 'supertest';
import { reset, query } from '../helpers/db.js';
import { createOrg, createInstance, createDatabase, createInstanceUser } from '../helpers/fixtures.js';
import { init, middleware } from '../../services/gateway/lib/http-proxy.js';
import { admin } from '../../services/models/index.js';
import config from '../../services/lib/config.js';

const ORG = 'gw-pub-org';
const INST = 'inst-gw-pub';
const INST_SLEEP = 'inst-gw-pub-sleep';
const DB = 'gw-pub-db';
const DB_SLEEP = 'gw-pub-sleep-db';
const PUBLIC = config.pgInstance.publicRole.username;

describe('http-proxy anonymous PostgREST access and the public user', function () {

  let agent, startStub;

  before(async function () {
    await reset();
    await createOrg({ name: ORG, title: 'Gateway Public Org' });
    await createInstance(ORG, { name: INST, state: 'RUN' });
    await createInstance(ORG, { name: INST_SLEEP, state: 'SLEEP' });
    // unresolvable pgrest hosts so proxied requests fail fast
    await createDatabase(ORG, INST, { name: DB, pgrest_hostname: 'gw-pub-db.invalid' });
    await createDatabase(ORG, INST_SLEEP, { name: DB_SLEEP, pgrest_hostname: 'gw-pub-sleep-db.invalid' });

    init();
    const app = express();
    app.use(middleware);
    agent = supertest(app);
  });

  after(async function () {
    await reset();
  });

  beforeEach(function () {
    startStub = sinon.stub(admin, 'startInstance').resolves({ starting: false });
  });

  afterEach(async function () {
    sinon.restore();
    await query(`DELETE FROM pgfarm.instance_user WHERE type = 'PUBLIC'`);
  });

  it('returns 401 for anonymous requests when the public user is disabled', async function () {
    const res = await agent.get(`/api/query/${ORG}/${DB}/my_table`);
    assert.equal(res.status, 401);
    assert.equal(res.body.code, 'PGFARM401');
  });

  it('does not wake a sleeping instance for anonymous requests when disabled', async function () {
    const res = await agent.get(`/api/query/${ORG}/${DB_SLEEP}/my_table`);
    assert.equal(res.status, 401);
    assert.isFalse(startStub.called, 'instance should not be started');
  });

  it('does not reject anonymous requests when the public user is enabled', async function () {
    await createInstanceUser(ORG, INST, { username: PUBLIC, type: 'PUBLIC', password: 'x' });
    const res = await agent.get(`/api/query/${ORG}/${DB}/my_table`);
    assert.notEqual(res.body?.code, 'PGFARM401');
  });

  it('does not reject authenticated requests when the public user is disabled', async function () {
    const res = await agent
      .get(`/api/query/${ORG}/${DB}/my_table`)
      .set('Authorization', 'Bearer some-token');
    assert.notEqual(res.body?.code, 'PGFARM401');
  });

  it('does not reject CORS preflight (OPTIONS) requests when the public user is disabled', async function () {
    const res = await agent
      .options(`/api/query/${ORG}/${DB}/my_table`)
      .set('Origin', 'https://example.com')
      .set('Access-Control-Request-Method', 'GET')
      .set('Access-Control-Request-Headers', 'authorization');
    assert.notEqual(res.body?.code, 'PGFARM401');
  });

  it('still wakes a sleeping instance for authenticated requests', async function () {
    await agent
      .get(`/api/query/${ORG}/${DB_SLEEP}/my_table`)
      .set('Authorization', 'Bearer some-token');
    assert.isTrue(startStub.calledOnce);
  });

});
