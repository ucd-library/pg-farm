const PG = require('pg');

async function run() {
  let c = new PG.Client({
    connectionString : 'postgres://pgfarm-public:go-aggies@localhost:5432/test/test'
  });
  await c.connect();
  
  console.log('connected');
  console.log(await c.query('SELECT NOW()'));
  await c.end();

}

run();