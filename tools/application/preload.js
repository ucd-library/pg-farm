const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getPgFarmConfig: () => ipcRenderer.invoke('getPgfarmConfig'),
  login: (opts) => ipcRenderer.invoke('login', opts),
  logout: () => ipcRenderer.invoke('logout'),
  openExternalUrl: (url) => ipcRenderer.invoke('openExternalUrl', url),
});

(async function() {
  // appConfig = await ipcRenderer.invoke('appConfig');
  pgFarmConfig = await ipcRenderer.invoke('getPgfarmConfig');
  user = await ipcRenderer.invoke('getPgfarmCred');

  if( user ) {
    user.loggedIn = true;
  } else {
    user = {loggedIn: false}
  }

  contextBridge.exposeInMainWorld('ELECTRON_CONFIG', {
    token : pgFarmConfig.tokenHash,
    user 
  });
})()