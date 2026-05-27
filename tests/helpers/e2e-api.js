import fs from 'fs';
import path from 'path';
import os from 'os';

/**
 * Read the current auth token from the pgfarm config file.
 *
 * @returns {string|null}
 */
function getToken() {
  const configFile = process.env.PGFARM_CONF_FILE || path.join(os.homedir(), '.pg-farm.json');
  if (!fs.existsSync(configFile)) return null;
  try {
    return JSON.parse(fs.readFileSync(configFile, 'utf8')).token || null;
  } catch (_) {
    return null;
  }
}

/**
 * Return the pgfarm API base URL from env.
 *
 * @returns {string}
 */
function getHost() {
  return (process.env.PGFARM_HOST || 'https://pgfarm.library.ucdavis.edu').replace(/\/$/, '');
}

/**
 * Make an authenticated request to the pgfarm API.
 *
 * @param {string} apiPath - path relative to host root, e.g. '/api/instance/my-org/my-inst'
 * @param {Object} opts
 * @param {string} opts.method - HTTP method (default 'GET')
 * @param {Object} opts.body - request body (JSON-serialised)
 * @param {boolean} opts.allowFailure - when true, non-2xx responses do not throw
 * @returns {Promise<Response>}
 */
async function apiRequest(apiPath, opts = {}) {
  const token = getToken();
  const url = getHost() + apiPath;
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const resp = await fetch(url, {
    method: opts.method || 'GET',
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });

  if (!resp.ok && !opts.allowFailure) {
    let detail = '';
    try { detail = await resp.text(); } catch (_) {}
    throw new Error(`API ${opts.method || 'GET'} ${apiPath} → ${resp.status}: ${detail}`);
  }

  return resp;
}

/**
 * GET a pgfarm API path and return parsed JSON.
 *
 * @param {string} apiPath
 * @param {Object} opts
 * @param {boolean} opts.allowNotFound - when true, returns null on 404 instead of throwing
 * @returns {Promise<Object|null>}
 */
export async function apiGet(apiPath, opts = {}) {
  const resp = await apiRequest(apiPath, { ...opts, method: 'GET', allowFailure: opts.allowNotFound || opts.allowFailure });
  if (opts.allowNotFound && resp.status === 404) return null;
  return resp.json();
}

/**
 * POST to a pgfarm API path and return parsed JSON.
 *
 * @param {string} apiPath
 * @param {Object} body
 * @param {Object} opts
 * @returns {Promise<Object>}
 */
export async function apiPost(apiPath, body, opts = {}) {
  const resp = await apiRequest(apiPath, { ...opts, method: 'POST', body });
  return resp.json();
}

/**
 * PUT to a pgfarm API path and return parsed JSON.
 *
 * @param {string} apiPath
 * @param {Object} body
 * @param {Object} opts
 * @returns {Promise<Object>}
 */
export async function apiPut(apiPath, body, opts = {}) {
  const resp = await apiRequest(apiPath, { ...opts, method: 'PUT', body });
  return resp.json();
}
