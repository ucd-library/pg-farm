import bunyan from 'bunyan';
import {URL} from 'url';
import config from './config.js';
import {LoggingBunyan} from '@google-cloud/logging-bunyan';


const streams = [];

if( config.logging.level != 'none' ) {
  // log to console
  streams.push({ stream: process.stdout });
}

// wire in stack driver if google cloud service account provided
let projectId;
if( config.gc.serviceAccountExists ) {

  // create bunyan logger for stackdriver
  let loggingBunyan = new LoggingBunyan({
    projectId: config.gc.projectId,
    keyFilename: config.gc.serviceAccountFile,
    resource : {type: 'project'}
  });

  // add new logger stream
  streams.push(loggingBunyan.stream());
}

let host = 'unknown.host'
try {
  host = new URL(config.service.url).host;
} catch(e) {}

let logger = bunyan.createLogger({
  name: (process.env.FIN_LOGGER_NAME || global.LOGGER_NAME || 'pg-farm')+'-'+host,
  level: config.logging.level || 'info',
  streams: streams
});

let info = {
  name: (process.env.FIN_LOGGER_NAME || global.LOGGER_NAME || 'pg-farm')+'-'+host,
  level: config.logging.level || 'info',
  googleCloudLogging : {
    enabled : config.google.serviceAccountExists,
    file : config.gc.serviceAccountFile
  }
}

logger.info('logger initialized', info);

export default logger;