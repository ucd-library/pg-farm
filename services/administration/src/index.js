import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import auth from './controllers/auth/index.js';
import api from './controllers/api.js';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';
import keycloak from '../../lib/keycloak.js';
import {admin} from '../../models/index.js';
import { logReqMiddleware } from '@ucd-lib/logger';
import './lib/cron/index.js';

const app = express();

app.use(logReqMiddleware(logger));

app.use(cookieParser());
app.use(bodyParser.json());
app.use(keycloak.setUser);

auth.register(app);

app.use('/api', api);

app.listen(config.service.port, () => {
  logger.info('PG Farm Admin service listening on port '+config.service.port);
  admin.initSchema();
});