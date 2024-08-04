import { contextBridge, ipcRenderer } from 'electron'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
// contextBridge.exposeInMainWorld('ipcRenderer', {
//   send: (channel, data) => {
//     // whitelist channels
//     let validChannels = ['nameOfClientChannel']
//     if (validChannels.includes(channel)) {
//       ipcRenderer.send(channel, data)
//     }
//   },
//   receive: (channel, func) => {
//     let validChannels = ['nameOfElectronChannel']
//     if (validChannels.includes(channel)) {
//       // Deliberately strip event as it includes `sender`
//       ipcRenderer.on(channel, (event, ...args) => func(...args))
//     }
//   }
// })


contextBridge.exposeInMainWorld('electronAPI', {
  addRowInJsonFile: (info) => ipcRenderer.send('add-row-in-json-file', info),
  fr: async (filePath) => {
    try {
      return await ipcRenderer.invoke('f-r', filePath);
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw error;
    }
  },
  fw: (textInfo) => ipcRenderer.send('f-w', textInfo),
  locateFileInOs: (filePath) => ipcRenderer.send('locate-file-in-os', filePath),
  determineIfIsDir: async (rootPath) => {
    return await ipcRenderer.invoke('determine-if-is-dir', rootPath)
  },
  subfilePathsInDir: async (rootPath) => {
    return await ipcRenderer.invoke('subfiles-in-dir', rootPath)
  },
  onDataWithinVues: (callback) => {
    ipcRenderer.on('on-data-within-vues', (event, data) => callback(event, data));
  },
  updateDataWithinVues: (data) => ipcRenderer.send('update-data-within-vues', data),
  openNewWindow: (windowInfo) => ipcRenderer.send('open-new-window', windowInfo),
  showSaveDialog: (info) => ipcRenderer.invoke('dialog:showSaveDialog', info),
  openDirectory: (info) => ipcRenderer.invoke('open-directory', info),
  getCurrentWindowBounds: () => ipcRenderer.invoke('window:getBounds'),
  executeSql: async (info) => { return await ipcRenderer.invoke('execute-sql', info)},
  transact: async (transactionInfo) => { return await ipcRenderer.invoke('transact', transactionInfo)},
  fileSearch: async (info) => { return await ipcRenderer.invoke('file-search', info)},
  saveFiles: async (fileObjs) => { return await ipcRenderer.invoke('save-files', fileObjs)},
  deleteFile: async (filePath) => { return await ipcRenderer.invoke('delete-file', filePath)},
})

