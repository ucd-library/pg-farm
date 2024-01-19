import express from 'express';
import bodyParser from 'body-parser';
import auth from '../../authenticator/index.js';
import api from './controllers/api.js';
import config from '../../lib/config.js';
import logger from '../../lib/logger.js';

const app = express();

app.use(bodyParser.json());

auth.register(app);

app.use('/api', api);

app.listen(config.service.port, () => {
  logger.info('PG Farm Admin service listening on port '+config.service.port);
});