import express from 'express';
import model from '../models/backup.js';
import config from '../lib/config.js';

const app = express();

app.post('/backup', async (req, res) => {
  try {
    await model.backup(config.pgInstance.name, config.pgInstance.organization);
    res.status(200).send('Backup started');
  } catch (e) {
    console.error('backup start failed', e);
    res.status(500).send('Backup started failed');
  }
});

app.post('/restore', (req, res) => {

});

app.listen(3000, () => {
  console.log('Backup service started on port 3000');
});