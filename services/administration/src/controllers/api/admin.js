import {Router} from 'express';

import instanceRoutes from './admin/instance.js';
import databaseRoutes from './admin/database.js';

const router = Router();

router.use('/instance', instanceRoutes);
router.use('/database', databaseRoutes);


export default router;