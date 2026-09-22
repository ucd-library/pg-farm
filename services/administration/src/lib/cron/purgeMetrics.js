import cron from '../../../../lib/cron.js';
import client from '../../../../lib/pg-admin-client.js';
import logger from '../../../../lib/logger.js';

const job = cron('*/5 * * * *', async () => {
  logger.info('Running metric snapshot cleanup cron job');
  try {
    await client.purgeStaleMetricSnapshots('2 minutes');
  } catch (err) {
    logger.error('Error running metric snapshot cleanup cron job', err);
  }
});

export {job}
