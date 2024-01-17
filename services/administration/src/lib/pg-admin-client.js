import PG from 'pg';
import config from '../config.js';

const client = new PG.Pool({
  user : config.pg.username,
  host : config.pg.host,
  database : config.pg.database,
  password : config.pg.password,
  port : config.pg.port
});

export default client;