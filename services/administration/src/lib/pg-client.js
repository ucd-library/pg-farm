import { Client } from 'pg';


class PGInstance {

  async getConnection(opts={}) {
    const client = new Client(opts);
    await client.connect()
    return client;
  }

  async query(connection, query, args) {
    const client = await this.getConnection(connection);
    
    try {
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