import express from 'express';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import config from '../lib/config.js';
import logger from '../lib/logger.js';
import keycloak from '../lib/keycloak.js';
import staticController from './controllers/static.js';
import { logReqMiddleware } from '@ucd-lib/logger';

const app = express();
app.use(logReqMiddleware(logger));

app.use(cookieParser());
app.use(bodyParser.json());
app.use(keycloak.setUser);

staticController(app);

app.listen(config.client.port, () => {
  logger.info(`Client running on port ${config.client.port}`);
});
