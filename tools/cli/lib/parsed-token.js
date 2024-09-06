import {config} from './config';

function getToken() {
  let payload = config.token ? config.token.split('.')[1] : null;
  if( !payload ) return null;
  
  try {
    return JSON.parse(Buffer.from(payload, 'base64').toString('utf8'));
  } catch(e) {}

  return null;
}

export default getToken;