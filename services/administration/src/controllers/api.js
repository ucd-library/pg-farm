import {Router} from 'express';
import database from './api/database.js';
import instance from './api/instance.js';
import organization from './api/organization.js';
import admin from './api/admin.js';
const router = Router();

router.use('/admin', admin);
router.use('/organization', organization);
router.use('/db', database);
router.use('/instance', instance);


export default router;