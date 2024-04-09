import {Router} from 'express';

import instanceRoutes from './admin/instance.js';
import databaseRoutes from './admin/database.js';
import organizationRoutes from './admin/organization.js';

const router = Router();

router.use('/instance', instanceRoutes);
router.use('/database', databaseRoutes);
router.use('/organization', organizationRoutes);

export default router;