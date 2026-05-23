import { execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const execFile = promisify(execFileCb);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CLI_BIN = path.resolve(__dirname, '../../tools/cli/bin/pgfarm.js');

/**
 * Spawn the pgfarm CLI binary with the given arguments.
 *
 * Uses execFile with an args array so values with spaces are passed through
 * verbatim without shell splitting or quote interpretation.
 *
 * The PGFARM_HOST env var (required) is inherited from the test process env,
 * which is set by the mocha env file loaded before tests run.
 *
 * @param {string[]} args - CLI arguments, e.g. ['instance', 'create', '-n', 'foo', '-g', 'bar']
 * @param {Object} opts
 * @param {boolean} opts.allowFailure - when true, non-zero exit returns result instead of throwing
 * @param {number} opts.timeout - exec timeout ms (default 30000)
 * @returns {Promise<{stdout: string, stderr: string, exitCode: number}>}
 */
export async function pgfarm(args, opts = {}) {
  try {
    const { stdout, stderr } = await execFile('node', [CLI_BIN, ...args], {
      env: process.env,
      timeout: opts.timeout ?? 30000,
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (err) {
    if (opts.allowFailure) {
      return {
        stdout: err.stdout || '',
        stderr: err.stderr || '',
        exitCode: err.code ?? 1,
      };
    }
    throw new Error(
      `pgfarm ${args.join(' ')} failed (exit ${err.code}):\n${err.stderr || err.message}`
    );
  }
}

/**
 * Like pgfarm(), but appends '--output json' and parses stdout as JSON.
 * Use for any command that supports --output (all commands via global-opts).
 *
 * @param {string[]} args
 * @param {Object} opts - same as pgfarm()
 * @returns {Promise<Object>} parsed JSON payload
 */
export async function pgfarmJson(args, opts = {}) {
  const result = await pgfarm([...args, '--output', 'json'], opts);
  try {
    return JSON.parse(result.stdout);
  } catch (_) {
    throw new Error(
      `pgfarm ${args.join(' ')} --output json: could not parse stdout as JSON:\n${result.stdout}`
    );
  }
}
