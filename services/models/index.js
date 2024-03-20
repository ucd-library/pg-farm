import admin from './admin.js';
import instance from './instance.js';
import database from './database.js';
import organization from './organization.js';
import user from './user.js';
import pgRest from './pg-rest.js';

const models = {
  admin,
  instance,
  database,
  user,
  pgRest,
  organization
};

for( let name in models ) {
  models[name].models = models;
}

export {
  admin,
  instance,
  database,
  user,
  pgRest,
  organization
}
