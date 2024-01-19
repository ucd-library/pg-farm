import {Router} from 'express';
import admin from './api/admin.js';
const router = Router();

router.use('/admin', admin);

export default router;