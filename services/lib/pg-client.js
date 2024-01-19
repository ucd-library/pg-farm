import PG from 'pg';

/**
 * @class PGInstance
 * @description A class for interacting with postgres instances.  Each query
 * will open and close a connection to the database.
 */
class PGInstance {

  async getConnection(opts={}) {
    const client = new PG.Client(opts);
    await client.connect()
    return client;
  }

  async query(connection, query, args) {
    const client = await this.getConnection(connection);
    
    try {
      console.log({query, args})
      let result = await client.query(query, args);
      await client.end();
      return result;
    } catch(e) {
      await client.end();
      throw e;
    }
  }

}

let inst = new PGInstance();
export default inst;