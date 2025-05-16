import { app, BrowserWindow, shell, ipcMain } from 'electron/main'
import path from 'node:path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import './main/index.js'
import {config} from '../cli/lib/config.js'


// async function handleFileOpen () {
//   const { canceled, filePaths } = await dialog.showOpenDialog()
//   if (!canceled) {
//     return filePaths[0]
//   }
// }

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function createWindow () {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  })
  // mainWindow.loadFile('index.html')
  let host = config.host || 'https://pgfarm.library.ucdavis.edu';
  console.log('loading host', host);
  mainWindow.loadURL(host);

  // TODO
  // mainWindow.webContents.setWindowOpenHandler(e => {
  //   console.log('window open handler', e);
  //   // if (url.startsWith('http')) {
  //   //   shell.openExternal(url);
  //   //   return { action: 'deny' };
  //   // }
  //   return { action: 'allow' };
  // });

  setTimeout(() => {
    mainWindow.webContents.openDevTools()
  }, 1000);
  
}

ipcMain.handle('openExternalUrl', (e, value) => {
  console.log('open external', e, value);
  shell.openExternal(value);
})

app.whenReady().then(() => {
  // ipcMain.handle('dialog:openFile', handleFileOpen)
  createWindow()
  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit()
})