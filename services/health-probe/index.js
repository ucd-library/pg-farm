import express from 'express';
import HealthProbe from './lib/model.js';
import config from '../lib/config.js';

const app = express();
const model = new HealthProbe();
model.start();

app.get('/health/:organization/:instance', async (req, res) => {
  try {
    let orgName = req.params.organization;
    if( orgName === '_' ) {
      orgName = null;
    }
    let instanceName = req.params.instance;
    res.json(await model.getStatus(instanceName, orgName));
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