const PG = require('pg');

// const connections = 105;
// const sleepTime = 5000;
const connections = 1;
const sleepTime = 30000;

let clients = [];

async function run() {
  clients = [];

  for( let i = 0; i < connections; i++ ) {
      let c = connectAndQuery(i)
        .catch(e => console.error('failed to connect', i));
      clients.push(c);
  }

  clients = await Promise.all(clients);
}

async function connectAndQuery(i) {
  // let c = new PG.Client({
  let c = new PG.Pool({
    host : 'pgfarm.library.ucdavis.edu',
    database : 'library/ca-base-layers',
    password : process.env.PGPASSWORD,
    port : 5432,
    user : 'jrmerz'
  })
  await c.connect();
  console.log('connected', i);

  for( let i = 0; i < 100; i++ ) {
    let res = await c.query('select * from foo');
    if( res.rows.length != 2 ) {
      console.error('unexpected result', i, res.rows);
    }
  }
  return c;
}

async function close() {
  let i = 0;
  for( let c of clients ) {
    c = await c;
    if( !c ) {
      continue;
    }
    c.end();
    console.log('disconnected', i++);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  await run();
  await sleep(sleepTime);
  await close();  
})();
