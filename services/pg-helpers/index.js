import express from 'express';
import {backup as model, admin, user, database} from '../models/index.js';
import config from '../lib/config.js';
import logger from '../lib/logger.js';

const app = express();

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

app.post('/sync-users', async (req, res) => {
  try {
    let updatePassword = req.query['update-password'] === 'true';

    await admin.syncInstanceUsers(config.pgInstance.name, config.pgInstance.organization, updatePassword)
    res.status(200).send('syncd users');
  } catch (e) {
    logger.error('sync users failed', e);
    res.status(500).send('sync users failed');
  }
});

app.put('/grant/:database/:schema/:user/:permission', async (req, res) => {
  try {

    await user.grant(
      req.params.database, 
      config.pgInstance.organization,
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