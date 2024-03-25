import cron from '../../../../lib/cron.js';
import config from '../../../../lib/config.js';
import {admin} from '../../../../models/index.js';
import logger from '../../../../lib/logger.js';

const job = cron(config.pgInstance.shutdownCron, () => {
  logger.info('Running shutdown cron job');
  admin.sleepInstances()
    .catch((err) => {
      logger.error('Error running shutdown cron job', err);
    });
});

export {job}