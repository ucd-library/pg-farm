import {job as backupCron} from './backup.js';
import {job as shutdownCron} from './shutdown.js';

backupCron.start();
shutdownCron.start();