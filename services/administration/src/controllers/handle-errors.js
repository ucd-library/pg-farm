import logger from '../../../lib/logger.js';

function handleError(res, error, details) {
  logger.error('Error in request', {error}, res.context.logSignal);

  res.status(500).json({
    message : error.message,
    details : details,
    stack : error.stack
  });

}

export default handleError;