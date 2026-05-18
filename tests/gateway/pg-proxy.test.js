import { assert } from 'chai';
import { EventEmitter } from 'events';
import PgFarmTcpServer from '../../services/gateway/lib/tcp-server/index.js';

/**
 * Minimal socket stand-in — an EventEmitter with the net.Socket surface
 * that PgFarmTcpServer and ProxyMonitor actually touch in tests.
 */
class MockSocket extends EventEmitter {
  constructor() {
    super();
    this.destroyed = false;
  }

  destroySoon() {
    this.destroyed = true;
  }
}

// pgConnection stub passed to registerConnection — autoCloseSockets: false
// avoids the server trying to call destroySoon() on sibling sockets.
const stubPgConn = { autoCloseSockets: false, sessionId: 'stub', ipAddress: '127.0.0.1' };

describe('PgFarmTcpServer', function () {

  let server;

  before(function () {
    // Do NOT call server.start() — that would bind a port.
    // We only test in-memory session-management methods.
    server = new PgFarmTcpServer({ name: 'test-tcp', logging: false, port: 59999 });
  });

  // ── getSessionId() ────────────────────────────────────────────────────────────

  describe('getSessionId()', function () {

    it('returns a non-empty string', function () {
      const id = server.getSessionId();
      assert.isString(id);
      assert.isAbove(id.length, 0);
    });

    it('returns unique values on successive calls', function () {
      const ids = new Set(Array.from({ length: 20 }, () => server.getSessionId()));
      assert.equal(ids.size, 20);
    });

  });

  // ── registerConnection() ──────────────────────────────────────────────────────

  describe('registerConnection()', function () {

    let socket;
    const sessionId = 'reg-test-session';

    before(function () {
      socket = new MockSocket();
      server.registerConnection(socket, 'incoming', sessionId, stubPgConn);
    });

    it('adds the socket to the sockets Map with correct metadata', function () {
      assert.isTrue(server.sockets.has(socket));
      const info = server.sockets.get(socket);
      assert.equal(info.type, 'incoming');
      assert.equal(info.session, sessionId);
    });

    it('creates a session entry containing the socket', function () {
      assert.isTrue(server.sessions.has(sessionId));
      const session = server.sessions.get(sessionId);
      assert.include(session.sockets, socket);
    });

    it('ignores a duplicate registration of the same socket', function () {
      // registerConnection returns early when the socket is already in the Map
      server.registerConnection(socket, 'incoming', sessionId, stubPgConn);
      const session = server.sessions.get(sessionId);
      assert.equal(session.sockets.filter(s => s === socket).length, 1);
    });

  });

  // ── multiple sockets per session ──────────────────────────────────────────────

  describe('multiple sockets per session', function () {

    it('tracks both incoming and outgoing sockets under one session', function () {
      const s1 = new MockSocket();
      const s2 = new MockSocket();
      const sid = 'multi-socket-session';

      server.registerConnection(s1, 'incoming', sid, stubPgConn);
      server.registerConnection(s2, 'outgoing', sid, stubPgConn);

      const session = server.sessions.get(sid);
      assert.include(session.sockets, s1);
      assert.include(session.sockets, s2);
    });

  });

  // ── socket close cleanup ──────────────────────────────────────────────────────

  describe('socket close event', function () {

    it('removes the socket and its session from the Maps after close', function (done) {
      const socket = new MockSocket();
      const sid = server.getSessionId();
      server.registerConnection(socket, 'incoming', sid, stubPgConn);

      // Verify socket is tracked before close
      assert.isTrue(server.sockets.has(socket));
      assert.isTrue(server.sessions.has(sid));

      socket.emit('close');

      // registerConnection uses setTimeout(100) inside its close handler
      setTimeout(() => {
        assert.isFalse(server.sockets.has(socket), 'socket should be removed from sockets Map');
        assert.isFalse(server.sessions.has(sid), 'session should be removed from sessions Map');
        done();
      }, 250);
    });

    it('keeps the session alive when a second socket remains after close', function (done) {
      const s1 = new MockSocket();
      const s2 = new MockSocket();
      const sid = server.getSessionId();

      server.registerConnection(s1, 'incoming', sid, stubPgConn);
      server.registerConnection(s2, 'outgoing', sid, stubPgConn);

      s1.emit('close');

      setTimeout(() => {
        assert.isFalse(server.sockets.has(s1), 's1 should be gone from sockets Map');
        assert.isTrue(server.sessions.has(sid), 'session should still exist while s2 is registered');
        const session = server.sessions.get(sid);
        assert.include(session.sockets, s2);
        done();
      }, 250);
    });

  });

});
