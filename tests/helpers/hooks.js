import { start, stop } from './db.js';
import { stubKeycloak, restoreKeycloak } from './auth.js';

/**
 * Root-level mocha hooks (loaded via --file in .mocharc.yml).
 * Runs once before/after the entire test suite.
 */

before(async function () {
  this.timeout(60000); // container pull can take a while the first time
  stubKeycloak();
  await start();
});

after(async function () {
  restoreKeycloak();
  await stop();
});
