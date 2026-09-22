import {job as backupCron} from './backup.js';
import {job as shutdownCron} from './shutdown.js';
import {job as purgeTokensCron} from './purgeTokens.js';
import {job as purgeMetricsCron} from './purgeMetrics.js';

backupCron.start();
shutdownCron.start();
purgeTokensCron.start();
purgeMetricsCron.start();