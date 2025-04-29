import {createLogger} from '@ucd-lib/logger';

let logger = createLogger({
  name : 'pgfarm',
  labelsProperties : ['name', 'hostname', 'corkTraceId', 'socketSessionId', 
    'socketEventType', 'remoteAddress', 'socketType', 'clientSocketState', 
    'serverSocketState', 'database', 'requestor', 'instance', 'organization'],
});

logger.objToString = function(obj) {
  let t = [];
  for( let key in obj ) {
    t.push(`${key}="${obj[key]}"`);
  }
  return t.join(', ');
}


export default logger;