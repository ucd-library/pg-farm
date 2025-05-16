import { ipcMain } from 'electron/main';
import auth from '../../cli/lib/auth.js';

ipcMain.handle('login', async (event, opts={}) => {
  opts.noQuit = true;
  await auth.login(opts);
});


ipcMain.handle('logout', async (event) => {
  console.log('logout', event);
  await auth.logout();
});