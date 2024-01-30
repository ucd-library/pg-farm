const PG = require('pg');

const connections = 100;
const sleepTime = 5000;

let clients = [];

async function run() {
  clients = [];

  for( let i = 0; i < connections; i++ ) {
    let c = new PG.Client({
      host : 'localhost',
      database : 'test',
      password : process.env.PGPASSWORD,
      port : 5432,
      user : 'jrmerz'
    })
    clients.push(c);
    await c.connect();
    console.log('connected', i);
  }
}

async function close() {
  let i = 0;
  for( let c of clients ) {
    c.end();
    console.log('disconnected', i++);
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  for( let i = 0; i < 20; i++ ) {
    try {
      console.log('******* run', i);
      await run();
    } catch(e) {
      console.error(e);
    }

    await close();
    await sleep(sleepTime);
  }
})();
