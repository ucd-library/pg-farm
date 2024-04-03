import cron from '../lib/cron.js';
import config from '../lib/config.js';
import {backup} from '../models/index.js';
import logger from '../lib/logger.js';


const job = cron(config.backup.cron, async () => {
  logger.info('Running auto backup cron job');

  await backup.dumpRoles(config.backup.autoBackupName);
  await backup.runPgDump(config.backup.autoBackupName, 'postgres');
});

export {job}