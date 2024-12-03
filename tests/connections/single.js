const PG = require('pg');

async function connect() {
  let c = new PG.Client({
    host : 'localhost',
    database : 'library/foo',
    password : process.env.PGPASSWORD,
    port : 5432,
    user : 'jrmerz'
  });

  c.on('error', (e) => {
    console.error('client error',  e);
  });

  c.on('end', () => {
    console.log('client end');
  });

  await c.connect();
  console.log('connected');


  // while(1) {
  //   let res = await c.query('select now(), * from foo;');
  //   console.log('res', res.rows);
  //   await new Promise((resolve) => setTimeout(resolve, 10000));
  // }
}

/*
release road map
ui tags
*/


(async () => {
  await connect();
})();
