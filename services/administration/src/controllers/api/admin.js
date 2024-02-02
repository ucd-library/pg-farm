import {Router} from 'express';

import instanceRoutes from './instance.js';
import databaseRoutes from './database.js';

const router = Router();

router.use('/instance', instanceRoutes);
router.use('/database', databaseRoutes);


export default router;