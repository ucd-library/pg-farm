import { assert } from 'chai';
import { pgfarm } from '../../helpers/cli.js';

/**
 * Smoke tests confirming the CLI can reach the configured host and that the
 * current user's token is valid.  These run first so any auth problem surfaces
 * immediately before heavier tests start.
 */
describe('auth', function () {

  it('whoami returns a non-empty username', async function () {
    const { stdout } = await pgfarm(['auth', 'whoami']);
    assert.isNotEmpty(stdout.trim(), 'expected a username from pgfarm auth whoami');
  });

  it('status reports logged in with a non-expired token', async function () {
    const { stdout } = await pgfarm(['auth', 'status']);
    assert.notMatch(stdout, /not logged in/i, 'expected an active session');
    assert.notMatch(stdout, /expired/i, 'expected a non-expired token');
  });

  it('token returns a non-empty hash', async function () {
    const { stdout } = await pgfarm(['auth', 'token']);
    assert.isNotEmpty(stdout.trim(), 'expected a token hash from pgfarm auth token');
  });

});
