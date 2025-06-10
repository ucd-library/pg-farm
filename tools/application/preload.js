const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getUser: () => ipcRenderer.invoke('getUser'),
  login: (opts) => ipcRenderer.invoke('login', opts),
  logout: () => ipcRenderer.invoke('logout'),
  openExternalUrl: (url) => ipcRenderer.invoke('openExternalUrl', url),
});