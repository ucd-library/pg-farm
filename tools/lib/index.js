import { Registry } from '@ucd-lib/cork-app-utils';

import appStateModel from './models/AppStateModel.js';
import contactModel from './models/ContactModel.js';
import databaseModel from './models/DatabaseModel.js';
import iconModel from './models/IconModel.js';
import instanceModel from './models/InstanceModel.js';
import organizationModel from './models/OrganizationModel.js';
import adminModel from './models/AdminModel.js';
import userModel from './models/UserModel.js';
import {config} from './config.js';
import utils from './utils.js';

Registry.ready();

if( typeof window !== 'undefined' ) {
  window.models = {
    appStateModel,
    contactModel,
    databaseModel,
    iconModel,
    instanceModel,
    organizationModel,
    adminModel,
    userModel,
    utils,
    config
  };
}

export {
  appStateModel,
  contactModel,
  databaseModel,
  iconModel,
  instanceModel,
  organizationModel,
  adminModel,
  userModel,
  utils,
  config
};
