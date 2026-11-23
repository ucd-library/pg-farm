import { assert } from 'chai';
import sinon from 'sinon';
import kubectl from '../../services/lib/kubectl.js';

const TOO_SOON = 'Command failed: kubectl rollout restart deployment rest-x\n' +
  'error: failed to create patch for rest-x: if restart has already been triggered ' +
  'within the past second, please wait before attempting to trigger another';

describe('kubectl.restart', function () {

  let clock;

  beforeEach(function () {
    sinon.stub(kubectl, 'init').resolves();
    clock = sinon.useFakeTimers();
  });

  afterEach(function () {
    clock.restore();
    sinon.restore();
  });

  it('runs a rollout restart', async function () {
    const exec = sinon.stub(kubectl, 'exec').resolves({ stdout: 'restarted' });
    const r = await kubectl.restart('deployment', 'rest-x');
    assert.equal(r.stdout, 'restarted');
    assert.equal(exec.firstCall.args[0], 'kubectl rollout restart deployment rest-x');
  });

  it('retries when a restart was already triggered within the past second', async function () {
    const exec = sinon.stub(kubectl, 'exec');
    exec.onFirstCall().rejects(new Error(TOO_SOON));
    exec.onSecondCall().resolves({ stdout: 'restarted' });

    const p = kubectl.restart('deployment', 'rest-x');
    await clock.tickAsync(1100);
    const r = await p;
    assert.equal(r.stdout, 'restarted');
    assert.equal(exec.callCount, 2);
  });

  it('gives up after the retry limit', async function () {
    const exec = sinon.stub(kubectl, 'exec').rejects(new Error(TOO_SOON));
    const p = kubectl.restart('deployment', 'rest-x', { retries: 2 });
    const assertion = p.then(() => assert.fail('should throw'), e => e);
    await clock.tickAsync(5000);
    const err = await assertion;
    assert.include(err.message, 'within the past second');
    assert.equal(exec.callCount, 3);
  });

  it('does not retry other errors', async function () {
    const exec = sinon.stub(kubectl, 'exec').rejects(new Error('deployments.apps "rest-x" not found'));
    try {
      await kubectl.restart('deployment', 'rest-x');
      assert.fail('should throw');
    } catch (e) {
      assert.include(e.message, 'not found');
    }
    assert.equal(exec.callCount, 1);
  });

});
