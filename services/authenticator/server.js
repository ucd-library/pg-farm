import express from 'express';
import bodyParser from 'body-parser';
import auth from './index.js';

const app = express();

app.use(bodyParser.json());

auth.register(app);

app.listen(config.service.port, () => {
  logger.info('oidc service listening on port '+config.service.port);
});