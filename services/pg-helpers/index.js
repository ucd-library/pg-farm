import express from 'express';
import bodyParser from 'body-parser';
import {backup as model, admin, user, database, instance} from '../models/index.js';
import { logReqMiddleware } from '@ucd-lib/logger';
import config from '../lib/config.js';
import logger from '../lib/logger.js';
import { createContext } from '../lib/context.js';


const app = express();

app.use(logReqMiddleware(logger));
app.use(bodyParser.json());

app.post('/backup', async (req, res) => {
  try {
    await model.backup(config.pgInstance.name, config.pgInstance.organization);
    res.status(200).send('Backup started');
  } catch (e) {
    logger.error('backup start failed', e);
    res.status(500).send('Backup started failed');
  }
});

app.post('/restore', async (req, res) => {
  try {
    model.restore(config.pgInstance.name, config.pgInstance.organization)
      .catch(e => logger.error('restore failed', e));
    res.status(200).send('Restore started');
  } catch (e) {
    logger.error('restore start failed', e);
    res.status(500).send('Restore started failed');
  }
});

app.post('/archive', async (req, res) => {
  try {
    model.archive(config.pgInstance.name, config.pgInstance.organization)
      .catch(e => logger.error('archive failed', e));
    res.status(200).send('archive started');
  } catch (e) {
    logger.error('archive start failed', e);
    res.status(500).send('archive started failed');
  }
});

app.post('/sync-user', async (req, res) => {
  try {
    let user = req.body;

    let ctx = await createContext({
      organization : config.pgInstance.organization,
      instance : config.pgInstance.name,
      corkTraceId : req.corkTraceId,
      requestor : 'pgfarm:pg-helper'
    });

    await instance.syncUser(ctx, user)
    res.status(200).send('syncd user: '+user.username);
  } catch (e) {
    logger.error('sync user failed', user.username, e);
    res.status(500).send('sync user failed: '+user.username);
  }
});

app.put('/grant/:database/:schema/:user/:permission', async (req, res) => {
  try {

    let ctx = await createContext({
      organization : config.pgInstance.organization,
      database : req.params.database,
      corkTraceId : req.corkTraceId,
      requestor : 'pgfarm:pg-helper'
    });

    await user.grant(
      ctx,
      req.params.schema, 
      req.params.user,
      req.params.permission
    );
    res.status(200).send('granted schema access');
  } catch (e) {
    logger.error('grant schema access failed', e);
    res.status(500).send('grant schema access failed');
  }
});

app.post('/:localDatabase/link/:organization/:database', async (req, res) => {
  try {
    let opts = req.body;
    let org = req.params.organization;
    if( org === '_' ) {
      org = null;
    }

    await database.link(
      req.params.localDatabase,
      req.params.database, 
      org,
      opts
    );
    res.status(200).send('linked');
  } catch (e) {
    logger.error('link failed', e);
    res.status(500).send('link failed');
  }
});

app.listen(3000, () => {
  logger.info('Pg Helper service started on port 3000');
});