import admin from './admin.js';
import backup from './backup.js';
import database from './database.js';
import healthProbe from './health-probe.js';
import instance from './instance.js';
import organization from './organization.js';
import pgRest from './pg-rest.js';
import user from './user.js';

const models = {
  admin,
  backup,
  database,
  healthProbe,
  instance,
  organization,
  pgRest,
  user
};

for( let name in models ) {
  models[name].models = models;
}

export {
  admin,
  backup,
  database,
  healthProbe,
  instance,
  organization,
  pgRest,
  user
}
