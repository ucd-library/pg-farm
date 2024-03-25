import cron from '../../../../lib/cron.js';
import config from '../../../../lib/config.js';
import {backup} from '../../../../models/index.js';
import logger from '../../../../lib/logger.js';

const job = cron(config.backup.cron, () => {
  logger.info('Running backup cron job');
  backup.remoteBackupAll();
});

export {job}
