import {Router} from 'express';
import database from './api/database.js';
import instance from './api/instance.js';
import organization from './api/organization.js';
import admin from './api/admin.js';
import icon from './api/icon/icon.js';
import contact from './api/contact.js';
import user from './api/user.js';
import {middleware as contextMiddleware} from '../../../lib/context.js';

const router = Router();

router.use(contextMiddleware);

router.use('/admin', admin);
router.use('/organization', organization);
router.use('/db', database);
router.use('/instance', instance);
router.use('/icon', icon);
router.use('/contact', contact);
router.use('/user', user);


export default router;
