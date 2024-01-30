import pgRest from '../administration/src/models/pg-rest.js';
import fs from 'fs';

let name = process.env.PGREST_INSTANCE_NAME;

async function run() {
  let file = await pgRest.generateConfigFile(name);
  fs.writeFileSync('/etc/postgrest.conf', file);
  process.exit(0);
}

run();