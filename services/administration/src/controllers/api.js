import {Router} from 'express';
import admin from './api/admin.js';
import database from './api/database.js';
const router = Router();

router.use('/admin', admin);
router.use('/db', database);

export default router;