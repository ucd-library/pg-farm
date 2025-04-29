import cron from '../../../../lib/cron.js';
import config from '../../../../lib/config.js';
import {admin} from '../../../../models/index.js';
import logger from '../../../../lib/logger.js';
import {createContext} from '../../../../lib/context.js';

const job = cron(config.pgInstance.shutdownCron, async () => {
  let ctx = await createContext({requestor : 'pgfarm:shutdown-cron'});
  logger.info('Running shutdown cron job', ctx.logSignal);

  admin.sleepInstances(ctx)
    .catch((err) => {
      logger.error('Error running shutdown cron job', {err}, ctx.logSignal);
    });
});

export {job}