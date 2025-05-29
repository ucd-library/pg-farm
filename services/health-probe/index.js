import express from 'express';
import {healthProbe} from '../models/index.js';
import config from '../lib/config.js';
import { logReqMiddleware } from '@ucd-lib/logger';
import { middleware as contextMiddleware } from '../lib/context.js';
import logger from '../lib/logger.js';

const app = express();

app.use(logReqMiddleware(logger));
healthProbe.start();

app.get('/health', contextMiddleware, async (req, res) => {
  try {
    res.json(await healthProbe.allStatus(req.context));
  } catch(e) {
    res.status(500).send({
      error : true,
      message: e.message,
      stack : e.stack
    });
  }
});

app.get('/health/:organization/:instance', contextMiddleware, async (req, res) => {
  try {
    res.json(await healthProbe.getStatus(req.context));
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