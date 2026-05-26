import { exec as execCb, spawn } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execCb);

export const E2E_NAMESPACE = process.env.E2E_K8S_NAMESPACE || 'pgfarm-test';
const SOURCE_NAMESPACE = process.env.E2E_SOURCE_NAMESPACE || 'pg-farm';

// Prevents the gke-gcloud-auth-plugin from opening a browser when credentials expire.
const NO_PROMPT_ENV = { ...process.env, CLOUDSDK_CORE_DISABLE_PROMPTS: '1' };

/**
 * @function checkGkeContext
 * @description Verifies that kubectl is installed and the current context points at
 * the expected GKE cluster. Reads local kubeconfig only — no network calls, no auth
 * attempts, no browser prompts. Exits the process with a clear error message if not,
 * so the test run fails fast with actionable instructions.
 *
 * @param {string} expectedCluster - GKE cluster name to match (e.g. 'pgfarm-dev')
 * @returns {Promise<void>}
 */
export async function checkGkeContext(expectedCluster, corkClusterName) {

  // Check kubectl is available
  try {
    await exec('kubectl version --client -o json', { timeout: 5000 });
  } catch(_) {
    console.error('\n  Error: kubectl not found or not executable.');
    console.error('  Run:  cork-kube init ' + corkClusterName);
    console.error('  then re-run the tests.\n');
    process.exit(1);
  }

  // Check the context cluster name (local kubeconfig read — no network, no auth)
  let clusterName = '';
  try {
    const { stdout, stderr } = await exec("kubectl config current-context", { timeout: 5000 });
    clusterName = stdout.trim();
  } catch(_) {}

  if( !clusterName.includes(expectedCluster) ) {
    console.error(`\n  Error: kubectl context points at '${clusterName || '(none)'}' — expected '${expectedCluster}'.`);
    console.error('  Run:  cork-kube init ' + corkClusterName);
    console.error('  then re-run the tests.\n');
    process.exit(1);
  }
}

/**
 * Runs a kubectl command and returns stdout.
 *
 * @param {string} cmd - kubectl arguments (without the 'kubectl' prefix)
 * @param {Object} opts
 * @param {string} opts.stdin - data to pipe to the process stdin
 * @returns {Promise<string>}
 */
async function kubectl(cmd, opts = {}) {
  if (opts.stdin) {
    const { stdout } = await exec(`echo '${JSON.stringify(opts.stdin).replace(/'/g, "'\\''")}' | kubectl ${cmd}`, { env: NO_PROMPT_ENV });
    return stdout;
  }
  const { stdout } = await exec(`kubectl ${cmd}`, { env: NO_PROMPT_ENV });
  return stdout;
}

/**
 * Runs a kubectl command with stdin piped from a JSON object.
 *
 * @param {string} cmd
 * @param {Object} obj - JSON body piped to stdin
 * @returns {Promise<string>}
 */
async function kubectlStdin(cmd, obj) {
  return new Promise((resolve, reject) => {
    const proc = execCb(`kubectl ${cmd}`, { shell: '/bin/bash', env: NO_PROMPT_ENV }, (err, stdout, stderr) => {
      if (err) return reject(err);
      resolve(stdout);
    });
    proc.stdin.write(JSON.stringify(obj));
    proc.stdin.end();
  });
}

/**
 * Creates the pgfarm-test namespace (idempotent), copies the service-account
 * secret from the pg-farm namespace, and sets the kubectl context default
 * namespace so that subsequent model-layer kubectl calls land in the right place.
 *
 * @returns {Promise<void>}
 */
export async function setupNamespace() {
  const rt  = '--request-timeout=30s';
  const eo  = { timeout: 35000, env: NO_PROMPT_ENV };

  // Create namespace (no-op if it already exists)
  await exec(`kubectl create namespace ${E2E_NAMESPACE} --dry-run=client -o yaml | kubectl apply -f - ${rt}`, eo);

  // Copy service-account secret from source namespace if not already present
  try {
    await exec(`kubectl get secret service-account -n ${E2E_NAMESPACE} ${rt}`, eo);
  } catch (_) {
    // Secret doesn't exist — copy from source namespace
    const rawSecret = await exec(`kubectl get secret service-account -n ${SOURCE_NAMESPACE} -o json ${rt}`, eo);
    const secret = JSON.parse(rawSecret.stdout);
    delete secret.metadata.resourceVersion;
    delete secret.metadata.uid;
    delete secret.metadata.creationTimestamp;
    secret.metadata.namespace = E2E_NAMESPACE;
    await kubectlStdin(`apply -n ${E2E_NAMESPACE} -f -`, secret);
  }

  // Set the default namespace for the current context so that kubectl.js
  // (which has no -n flag) targets the right namespace automatically.
  await exec(`kubectl config set-context --current --namespace=${E2E_NAMESPACE}`);
}

/**
 * Removes all resources in the pgfarm-test namespace and restores the kubectl
 * context default namespace to its prior value.
 *
 * @param {Object} opts
 * @param {boolean} opts.deleteNamespace - when true (default) deletes the namespace entirely
 * @returns {Promise<void>}
 */
export async function teardownNamespace(opts = {}) {
  const deleteNs = opts.deleteNamespace !== false;

  if (deleteNs) {
    try {
      // --wait=false returns immediately; resources continue terminating in the background.
      // Waiting for full namespace deletion can block indefinitely if a resource gets stuck.
      await exec(`kubectl delete namespace ${E2E_NAMESPACE} --ignore-not-found=true --wait=false`, { env: NO_PROMPT_ENV });
    } catch(e) {
      // ignore — namespace may already be gone
    }
  } else {
    // Just remove pgfarm-labelled workloads without nuking the namespace
    try {
      await exec(`kubectl delete statefulsets,services -n ${E2E_NAMESPACE} --all --ignore-not-found=true`, { env: NO_PROMPT_ENV });
    } catch(e) {}
  }

  // Restore default namespace back to the pg-farm dev namespace
  await exec(`kubectl config set-context --current --namespace=${SOURCE_NAMESPACE}`);
}

/**
 * Polls kubectl until the first pod of a StatefulSet (hostname-0) has all
 * containers in Ready state, or the timeout expires.
 *
 * @param {string} hostname - StatefulSet name (pod will be hostname-0)
 * @param {Object} opts
 * @param {number} opts.timeoutMs - polling timeout in milliseconds (default 120000)
 * @param {number} opts.intervalMs - polling interval in milliseconds (default 3000)
 * @param {number} opts.execTimeoutMs - per-kubectl-call timeout (default 8000)
 * @returns {Promise<Object>} the pod JSON object when ready
 */
export async function waitForPodReady(hostname, opts = {}) {
  const timeoutMs = opts.timeoutMs ?? 120000;
  const intervalMs = opts.intervalMs ?? 3000;
  const execTimeoutMs = opts.execTimeoutMs ?? 8000;
  const podName = `${hostname}-0`;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    try {
      console.log(`kubectl get pod ${podName} -n ${E2E_NAMESPACE} -o json`);
      const raw = await exec(`kubectl get pod ${podName} -n ${E2E_NAMESPACE} -o json`, { timeout: execTimeoutMs });
      console.log('kubectl output:', raw);
      const pod = JSON.parse(raw.stdout);
      const conditions = pod.status?.conditions ?? [];
      const ready = conditions.find(c => c.type === 'Ready' && c.status === 'True');
      if (ready) return pod;
    } catch (_) {
      // pod may not exist yet, or kubectl timed out — keep polling
    }
    await new Promise(r => setTimeout(r, intervalMs));
  }

  throw new Error(`Pod ${podName} not ready after ${timeoutMs}ms`);
}

/**
 * Starts a kubectl port-forward in the background and resolves once the
 * tunnel is open (stdout/stderr contains "Forwarding from").
 *
 * @param {string} podName - full pod name (e.g. inst-e2e-org-e2e-test-0)
 * @param {number} localPort - local port to bind
 * @param {number} remotePort - pod port to forward to
 * @param {Object} opts
 * @param {number} opts.readyTimeoutMs - ms to wait for "Forwarding from" (default 10000)
 * @returns {Promise<{proc: ChildProcess, close: Function}>}
 */
export function portForward(podName, localPort, remotePort, opts = {}) {
  const readyTimeout = opts.readyTimeoutMs ?? 10000;

  return new Promise((resolve, reject) => {
    const proc = spawn('kubectl', [
      'port-forward',
      `pod/${podName}`,
      `${localPort}:${remotePort}`,
      '-n', E2E_NAMESPACE
    ]);

    const timer = setTimeout(() => {
      proc.kill();
      reject(new Error(`kubectl port-forward to ${podName}:${remotePort} did not open within ${readyTimeout}ms`));
    }, readyTimeout);

    // Detach from Node's event loop — we manage the lifecycle explicitly via close().
    proc.unref();

    const onData = (chunk) => {
      if (chunk.toString().includes('Forwarding from')) {
        clearTimeout(timer);
        resolve({
          proc,
          /**
           * @method close
           * @description Kill the port-forward process and release stdio handles.
           */
          close() {
            proc.stdout.destroy();
            proc.stderr.destroy();
            proc.kill();
          }
        });
      }
    };

    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

/**
 * Returns true if all containers in the pod are Ready.
 *
 * @param {string} hostname
 * @returns {Promise<boolean>}
 */
export async function isPodReady(hostname) {
  try {
    const raw = await exec(`kubectl get pod ${hostname}-0 -n ${E2E_NAMESPACE} -o json`);
    const pod = JSON.parse(raw.stdout);
    const conditions = pod.status?.conditions ?? [];
    return !!conditions.find(c => c.type === 'Ready' && c.status === 'True');
  } catch (_) {
    return false;
  }
}

/**
 * Returns true if the StatefulSet for the given hostname exists in the E2E namespace.
 *
 * @param {string} hostname
 * @returns {Promise<boolean>}
 */
export async function statefulSetExists(hostname) {
  try {
    await exec(`kubectl get statefulset ${hostname} -n ${E2E_NAMESPACE}`);
    return true;
  } catch (_) {
    return false;
  }
}
