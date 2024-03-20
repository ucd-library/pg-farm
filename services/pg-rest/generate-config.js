import {pgRest} from '../models/index.js';
import fs from 'fs';

let name = process.env.PGREST_DATABASE_NAME;
let org = process.env.PGREST_ORGANIZATION_NAME;

async function run() {
  let file = await pgRest.generateConfigFile(name, org);
  fs.writeFileSync('/etc/postgrest.conf', file);
  process.exit(0);
}

run();