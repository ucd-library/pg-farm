import cron from '../../../../lib/cron.js';
import client from '../../../../lib/pg-admin-client.js';
import logger from '../../../../lib/logger.js';

const job = cron('0 2 * * *', async () => {
  logger.info('Running token cleanup cron job');
  try {
    await client.purgeExpiredTokens();
  } catch (err) {
    logger.error('Error running token cleanup cron job', err);
  }
});

export {job}