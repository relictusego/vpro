'use strict'

import { app, protocol, BrowserWindow, ipcMain, shell, dialog } from 'electron'
import { createProtocol } from 'vue-cli-plugin-electron-builder/lib'
// import installExtension, { VUEJS3_DEVTOOLS } from 'electron-devtools-installer'
const path = require('path')
const fs = require('fs')
import { bindEventWithIpc } from '@/js/ipc-event'
import { BOUNDS } from '@/js/constants'

const isDevelopment = process.env.NODE_ENV !== 'production'
let win

// Scheme must be registered before the app is ready
protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { secure: true, standard: true } }
])

async function createWindow() {
  // Create the browser window.
  win = new BrowserWindow({
    width: BOUNDS.WIDTH,
    height: BOUNDS.HEIGHT,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      // Use pluginOptions.nodeIntegration, leave this alone
      // See nklayman.github.io/vue-cli-plugin-electron-builder/guide/security.html#node-integration for more info
      nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
      contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
      enableRemoteModule: true,
      webSecurity: false, // 禁用 web 安全性检查
    },
    autoHideMenuBar: true
  })

  if (process.env.WEBPACK_DEV_SERVER_URL) {
    // Load the url of the dev server if in development mode
    await win.loadURL(process.env.WEBPACK_DEV_SERVER_URL)
    // if (!process.env.IS_TEST) win.webContents.openDevTools()
  } else {
    createProtocol('app')
    // Load the index.html when not in development
    win.loadURL('app://./index.html')
  }

  const kit = {
    'app': app,
    'protocol': protocol,
    'BrowserWindow': BrowserWindow,
    'ipcMain': ipcMain,
    'shell': shell,
    'path': path,
    'fs': fs,
    'preloadPath': path.join(__dirname, 'preload.js'),
    'dialog': dialog,
    'mainWindow': win,
    
  }

  // place the function below to guarantee mainWindow has been initialized
  // before it's used in the function below
  bindEventWithIpc(kit)
}

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  // if (isDevelopment && !process.env.IS_TEST) {
  //   // Install Vue Devtools
  //   try {
  //     await installExtension(VUEJS3_DEVTOOLS)
  //   } catch (e) {
  //     console.error('Vue Devtools failed to install:', e.toString())
  //   }
  // }
  
  process.on('uncaughtException', (error) => {
    console.error('Global error caught in main process:', error);
    // 可以在这里记录错误日志或执行其他操作
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled promise rejection in main process:', reason);
    // 可以在这里记录错误日志或执行其他操作
  });
  
  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
 
import { initDb, runTransaction } from './db/init-db'
initDb(app)

