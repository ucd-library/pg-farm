import express from 'express';
import model from './models/backup.js';
import config from '../lib/config.js';

const app = express();

app.post('/backup', async (req, res) => {
  try {
    await model.backup(config.pgInstance.name);
    res.status(200).send('Backup started');
  } catch (e) {
    console.error('backup start failed', e);
    res.status(500).send('Backup started failed');
  }
});

app.post('/restore', (req, res) => {

});