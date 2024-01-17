import crypto from 'crypto';

class PgFarmUtils {

  generatePassword(length = 32) {
    return crypto.randomBytes(length).toString('base64')
  }

}

const instance = new PgFarmUtils();
export default instance;