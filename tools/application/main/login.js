import { ipcMain } from 'electron/main';
import auth from '../../cli/lib/auth.js';

ipcMain.handle('login', async (event, opts={}) => {
  console.log('login', event, opts);
  opts.noQuit = true;
  await auth.login(opts);
});