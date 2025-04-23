import {job as backupCron} from './backup.js';
import {job as shutdownCron} from './shutdown.js';
import {job as purgeTokensCron} from './purgeTokens.js';

backupCron.start();
shutdownCron.start();
purgeTokensCron.start();