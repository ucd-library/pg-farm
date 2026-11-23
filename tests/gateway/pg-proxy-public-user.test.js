import { assert } from 'chai';
import sinon from 'sinon';
import { EventEmitter } from 'events';
import { reset, query } from '../helpers/db.js';
import { createOrg, createInstance, createDatabase, createInstanceUser } from '../helpers/fixtures.js';
import ProxyConnection from '../../services/gateway/lib/pg-proxy/proxy-connection.js';
import monitor from '../../services/gateway/lib/pg-proxy/monitor.js';
import { admin } from '../../services/models/index.js';
import config from '../../services/lib/config.js';

const ORG = 'pgp-pub-org';
const INST = 'inst-pgp-pub';
const DB = 'pgp-pub-db';
const INST_SLEEP = 'inst-pgp-pub-sleep';
const DB_SLEEP = 'pgp-pub-sleep-db';
const PUBLIC = config.pgInstance.publicRole.username;

/**
 * @function createConnection
 * @description create a ProxyConnection with a fake client socket and the startup
 * properties for a public user login
 *
 * @returns {ProxyConnection}
 */
function createConnection() {
  const socket = new EventEmitter();
  socket.remoteAddress = '127.0.0.1';
  socket.setKeepAlive = () => {};
  socket.write = () => true;
  socket.destroy = () => {};
  const conn = new ProxyConnection(socket, { registerConnection() {} }, 'pgp-pub-session');
  conn.startupProperties = { user: PUBLIC, database: DB };
  conn.dbOrganization = ORG;
  return conn;
}

describe('pg-proxy public user login check', function () {

  before(async function () {
    await reset();
    await createOrg({ name: ORG, title: 'PG Proxy Public Org' });
    await createInstance(ORG, { name: INST, state: 'RUN' });
    await createDatabase(ORG, INST, { name: DB });
    await createInstance(ORG, { name: INST_SLEEP, state: 'SLEEP' });
    await createDatabase(ORG, INST_SLEEP, { name: DB_SLEEP });
  });

  after(async function () {
    await reset();
  });

  afterEach(async function () {
    sinon.restore();
    await query(`DELETE FROM pgfarm.instance_user WHERE type = 'PUBLIC'`);
  });

  it('allows the public user when the public user is enabled', async function () {
    await createInstanceUser(ORG, INST, { username: PUBLIC, type: 'PUBLIC', password: 'x' });
    const conn = createConnection();
    const notice = sinon.stub(conn, 'sendNotice').resolves();

    const ok = await conn.checkUserAccess();
    assert.isTrue(ok);
    assert.equal(conn.pgFarmUser.user_type, 'PUBLIC');
    assert.isFalse(notice.called);
  });

  describe('startup message against a sleeping instance (must not wake it)', function () {

    /**
     * @function startupOnSleepingInstance
     * @description run the full handleStartupMessage path for a public user login against
     * the sleeping instance, with the wake / socket side effects stubbed
     *
     * @returns {Promise<Object>} {startInstance, createServerSocket, closeSockets, notice}
     */
    async function startupOnSleepingInstance() {
      const conn = createConnection();
      conn.startupProperties = { user: PUBLIC, database: DB_SLEEP };
      conn.isSecureSocket = true; // skip the plain text / tls guard

      sinon.stub(conn, 'parseStartupMessage'); // keep the preset startupProperties
      const notice = sinon.stub(conn, 'sendNotice').resolves();
      const closeSockets = sinon.stub(conn, 'closeSockets').resolves();
      const createServerSocket = sinon.stub(conn, 'createServerSocket').resolves();
      const requestPassword = sinon.stub(conn, 'requestPassword').resolves();
      const startInstance = sinon.stub(admin, 'startInstance').resolves({ starting: false });
      sinon.stub(monitor, 'onClientConnection');
      sinon.stub(monitor, 'logProxyConnectionEvent');

      await conn.handleStartupMessage(Buffer.alloc(8));
      return { startInstance, createServerSocket, requestPassword, closeSockets, notice };
    }

    it('rejects and closes without creating a server socket or starting the instance when disabled', async function () {
      const r = await startupOnSleepingInstance();
      assert.isFalse(r.startInstance.called, 'instance must not be started');
      assert.isFalse(r.createServerSocket.called, 'server socket must not be created');
      assert.isFalse(r.requestPassword.called);
      assert.isTrue(r.closeSockets.called);
      assert.include(r.notice.firstCall.args[2], 'is not registered with the database');
    });

    it('positive control: proceeds to the server socket (which wakes the instance) when enabled', async function () {
      await createInstanceUser(ORG, INST_SLEEP, { username: PUBLIC, type: 'PUBLIC', password: 'x' });
      const r = await startupOnSleepingInstance();
      assert.isTrue(r.createServerSocket.calledOnce, 'public login should connect when enabled');
      assert.isFalse(r.closeSockets.called);
    });

  });

  it('rejects the public user as not registered when the public user is disabled', async function () {
    const conn = createConnection();
    const notice = sinon.stub(conn, 'sendNotice').resolves();

    const ok = await conn.checkUserAccess();
    assert.isFalse(ok);
    assert.isTrue(notice.calledOnce);
    assert.include(notice.firstCall.args[2], 'is not registered with the database');
  });

});
