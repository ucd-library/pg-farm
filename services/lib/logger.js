import {createLogger} from '@ucd-lib/logger';
import config from './config.js';

let logger = createLogger({
  name : 'pgfarm'
});


export default logger;