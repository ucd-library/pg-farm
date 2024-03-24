import { CronJob } from 'cron';
import config from '../../../../lib/config.js';
import {instance} from '../../../../models/index.js';
import logger from '../../../../lib/logger.js';

const job = new CronJob(config.pgInstance.shutdownCron, () => {
  logger.info('Running shutdown cron job');
  instance.sleepInstances()
    .catch((err) => {
      logger.error('Error running shutdown cron job', err);
    });
});

export {job}