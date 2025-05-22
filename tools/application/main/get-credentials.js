import { ipcMain } from 'electron/main';
import {save, config, getParsedToken} from '../../cli/lib/config.js';

// ipcMain.handle('getPgfarmConfig', () => {
//   return config;
// });

// ipcMain.handle('getPgfarmCred', () => {
//   return getParsedToken();
// });

ipcMain.handle('getUser', (event, opts) => {
  let user = getParsedToken();

    if( user && user.expiresDays > 0 ) {
    user.loggedIn = true;
  } else {
    user = {loggedIn: false}
  }

  return {
    user,
    token: config.tokenHash
  }
});