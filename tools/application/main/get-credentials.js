import { ipcMain } from 'electron/main';
import {save, config, getParsedToken} from '../../cli/lib/config.js';

ipcMain.handle('getPgfarmConfig', () => {
  return config;
})

ipcMain.handle('getPgfarmCred', () => {
  return getParsedToken();
})