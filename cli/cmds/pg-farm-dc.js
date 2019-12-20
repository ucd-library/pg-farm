const exec = require('../../node-lib/lib/exec');
let args = process.argv.slice(2);

if( args.length === 0 ) {
  console.error('pg-farm cluster name required');
  process.exit(-1);
}

let cluster = args.splice(0, 1)[0];

(async function() {
  try {
    await exec('docker-compose ', args);
  } catch(e) {}
})();