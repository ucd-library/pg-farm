import {pgRest} from '../administration/src/models/index.js';
import fs from 'fs';

let name = process.env.PGREST_INSTANCE_NAME;
let org = process.env.PGREST_ORGANIZATION_NAME;

async function run() {
  let file = await pgRest.generateConfigFile(name, org);
  fs.writeFileSync('/etc/postgrest.conf', file);
  process.exit(0);
}

run();