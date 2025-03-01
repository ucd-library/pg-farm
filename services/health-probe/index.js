import express from 'express';
import {healthProbe} from '../models/index.js';
import config from '../lib/config.js';
import { logReqMiddleware } from '@ucd-lib/logger';
import logger from '../lib/logger.js';

const app = express();

app.use(logReqMiddleware(logger));

healthProbe.start();

app.get('/health', async (req, res) => {
  try {
    res.json(await healthProbe.allStatus());
  } catch(e) {
    res.status(500).send({
      error : true,
      message: e.message,
      stack : e.stack
    });
  }
});

app.get('/health/:organization/:instance', async (req, res) => {
  try {
    let orgName = req.params.organization;
    if( orgName === '_' ) {
      orgName = null;
    }
    let instanceName = req.params.instance;
    res.json(await healthProbe.getStatus(instanceName, orgName));
  } catch(e) {
    res.status(500).send({
      error : true,
      message: e.message,
      stack : e.stack
    });
  }
});

app.listen(config.healthProbe.port, () => {
  console.log('HealthProbe listening on port '+config.healthProbe.port);
});