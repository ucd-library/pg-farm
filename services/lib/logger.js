import {createLogger} from '@ucd-lib/logger';

let logger = createLogger({
  name : 'pgfarm',
  labelsProperties : ['name', 'hostname', 'corkTraceId', 'socketSessionId', 
    'socketEventType', 'remoteAddress', 'socketType', 'clientSocketState', 
    'serverSocketState', 'database', 'user', 'instance'],
});


export default logger;