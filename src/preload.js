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
  addOneVideoInFile: (videoInfo) => ipcRenderer.send('add-one-video-in-file', videoInfo),
  fr: async (filePath) => {
    try {
      const fileContent = await ipcRenderer.invoke('f-r', filePath);
      return fileContent;
    } catch (error) {
      console.error('Error fetching file content:', error);
      throw error;
    }
  },
  fw: (textInfo) => ipcRenderer.send('f-w', textInfo),
  locateFileInOs: (filePath) => ipcRenderer.send('locate-file-in-os', filePath),
  subfilesInDir: async (rootPath) => {
    return await ipcRenderer.invoke('subfiles-in-dir', rootPath)
  },
  onDataWhtinVues: (callback) => {
    ipcRenderer.on('on-data-within-vues', (event, data) => callback(event, data));
  },
  updateDataWithinVues: (data) => ipcRenderer.send('update-data-within-vues', data),
  openNewWindow: (windowInfo) => ipcRenderer.send('open-new-window', windowInfo),
  showSaveDialog: () => ipcRenderer.invoke('dialog:showSaveDialog'),
  getCurrentWindowBounds: () => ipcRenderer.invoke('window:getBounds'),
  executeSql: async (info) => { return await ipcRenderer.invoke('excute-sql', info)},
  transact: async (transactionInfo) => { return await ipcRenderer.invoke('transact', transactionInfo)},
})

