import { CronJob } from 'cron';
import config from '../../../../lib/config.js';
import {backup} from '../../../../models/index.js';
import logger from '../../../../lib/logger.js';

const job = new CronJob(config.backup.cron, () => {
  logger.info('Running backup cron job');
  backup.remoteBackupAll();
});

export {job}
