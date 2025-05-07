import config from '../../../services/lib/config.js';
import { ipcMain } from 'electron/main';

ipcMain.handle('appConfig', () => {
  return config;
})