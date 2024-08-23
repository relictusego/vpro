import { BOUNDS, DEFAULT_CONFIG_DEST, tableNameMap, DIR_FOR_SYS } from '../constants'
import { operationForScriptRow } from '@/db/operation/operation-4-script-row'
import { operationForVideo } from '@/db/operation/operation-4-video'
import { operationForScriptBk } from '@/db/operation/operation-4-script-bk'
import { operationForFileRank } from '@/db/operation/operation-4-file-rank'
import { operationForGlobalShortcut } from '@/db/operation/operation-4-global-shortcut'
import { operationForAudioWaveCanvas } from '@/db/operation/operation-4-audio-wave-canvas'
import { transactionHandler, manageTransaction } from '@/db/operation/transaction-handler'
import { searchFilesByKeyword, createNewWindow, saveFiles, readJsonFile } from '../functions/ipc-functions'
import util from 'util'
import { bindGlobalShortcut } from './ipc-global-shortcut'

export function bindEventWithIpc(kits) {
  const { app, protocol, BrowserWindow, ipcMain, shell, path, fs, preloadPath, dialog, globalShortcut } = kits

  // write rows into local file
  ipcMain.handle('add-rows-in-json-file', (event, info) => {
    const { rows, dest } = JSON.parse(info)
    let contentObj = {}
    const filePath = path.join(app.getPath('userData'), dest)
    try {
      const str = fs.readFileSync(filePath)
      contentObj = JSON.parse(str)
    } catch (e) {
      console.log(e);
    }
    rows.forEach(row => {
      contentObj[row.fieldName] = row.fieldValue
    })
    try {
      fs.writeFileSync(filePath, JSON.stringify(contentObj, null, 2));
      return true
    } catch (error) {
      return false
    }
  })

  // read local file
  ipcMain.handle('f-r', (event, filePath) => {
    try {
      filePath = path.join(app.getPath('userData'), filePath)
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      return fileContent
    } catch (error) {
      console.error('Error reading file:', error.message);
      return null
    }
  })

  // write text into local file
  ipcMain.on('f-w', (event, textInfo) => {
    const { text, dest } = JSON.parse(textInfo);
    const regex = /^[A-Z]:\\/
    let filePath
    if (regex.test(dest)) {
      filePath = dest
    } else {
      filePath = path.join(app.getPath('userData'), dest)
    }

    fs.writeFileSync(filePath, text);
  })

  // locate file in os
  ipcMain.on('locate-file-in-os', (event, filePath) => {
    if (filePath) {
      shell.showItemInFolder(filePath); // 打开文件所在文件夹并选中文件
    }
  });

  ipcMain.handle('determine-if-is-dir', async (event, rootPath) => {
    let start = Date.now()
    const stat = util.promisify(fs.stat)
    const stats = await stat(rootPath)
    // return empty arr if is a file
    return stats.isDirectory()
  })

  // list all sub-files in a directory specified
  ipcMain.handle('subfiles-in-dir', async (event, rootPath) => {
    const stat = util.promisify(fs.stat)
    let paths = [];
    // console.log(`rootPath====${rootPath}`);
    const stats = await stat(rootPath)
    console.log('File Size:', stats.size, 'bytes');
    console.log('File Last Modified:', stats.mtime);
    console.log('File Creation Time:', stats.birthtime);
    console.log('Is it a file?', stats.isFile());
    console.log('Is it a directory?', stats.isDirectory());
    // return empty arr if is a file
    if (stats.isFile()) return paths

    fs.readdirSync(rootPath).forEach(file => {
      const fullPath = path.join(rootPath, file);
      paths.push(fullPath);
    });
    return paths;
  })

  // share date from one vue component to another one
  ipcMain.handle('update-data-within-vues', async (event, data) => {
    const promises = BrowserWindow.getAllWindows().map((win) => {
      return new Promise((resolve) => {
        // Send data to the renderer process
        win.webContents.send('on-data-within-vues', data);

        // Listen for the response from the renderer process
        ipcMain.once('data-from-renderer', (event, responseData) => {
          console.log(`Received from renderer: ${JSON.stringify(responseData)}`);
          resolve(responseData);
        });
      });
    });

    // Wait for all windows to respond and return the first non-null response
    const results = await Promise.all(promises);
    return results.find(result => result !== null && result !== undefined);
  });

  ipcMain.on('open-new-window', (event, windowInfo) => {
    try {
      const { href, bounds } = JSON.parse(windowInfo)
      // place FileExplorer on the left of ScriptCreation
      bounds.x -= BOUNDS.WIDTH
      createNewWindow(kits, href, bounds)
    } catch (error) {
      throw new Error('窗口创建失败', error)
    }
  });

  // Make `dialog` available to renderer processes
  ipcMain.handle('dialog:showSaveDialog', async (event, info) => {
    try {
      const { defaultPath } = JSON.parse(info)
      // Show the save dialog
      const result = await dialog.showSaveDialog({
        title: '导出视频信息',
        defaultPath: defaultPath,
        filters: [
          { name: 'CSV Files', extensions: ['csv'] }
        ]
      });

      // Check if the user canceled the dialog
      if (result.canceled) {
        return { canceled: true };
      }

      // Return the file path if the user selected a file
      return { filePath: result.filePath };

    } catch (error) {
      // Handle any errors that occurred
      console.error('Error showing save dialog:', error);
      return { canceled: true, error: error.message };
    }
  });

  ipcMain.handle('open-directory', async (event, info) => {
    const { defaultPath } = JSON.parse(info)
    const dialogInfo = {
      properties: ['openDirectory'],
    }
    if (defaultPath !== null && defaultPath !== undefined) {
      dialogInfo['defaultPath'] = defaultPath
    }

    const result = await dialog.showOpenDialog(dialogInfo)
    if (result.canceled) {
      return null
    } else {
      return result.filePaths[0]
    }
  });

  ipcMain.handle('window:getBounds', (event) => {
    const webContents = event.sender;
    const win = BrowserWindow.fromWebContents(webContents);
    if (win) {
      return win.getBounds();
    } else {
      throw new Error('Window not found');
    }
  });

  const operationMap = {}
  operationMap[tableNameMap.scriptRows] = operationForScriptRow
  operationMap[tableNameMap.video] = operationForVideo
  operationMap[tableNameMap.scriptBk] = operationForScriptBk
  operationMap[tableNameMap.fileRank] = operationForFileRank
  operationMap[tableNameMap.globalShortcut] = operationForGlobalShortcut
  operationMap[tableNameMap.audioWaveCanvas] = operationForAudioWaveCanvas

  ipcMain.handle('execute-sql', (event, info) => {
    // console.log(info);
    const { tableName, operation, funcName, data } = JSON.parse(info)
    const func = operationMap[tableName][operation][funcName]
    // console.log(func);
    if (data === null || data === undefined) {
      return func()
    } else {
      return func(data)
    }
  });

  // handle transactional sql execution
  ipcMain.handle('transact', (event, transactionInfo) => {
    const { method, args } = JSON.parse(transactionInfo)
    const func = transactionHandler[method]
    return func(args)
  });

  ipcMain.handle('file-search', (event, info) => {
    const { dir, keyword, reg, extensions } = JSON.parse(info)
    return searchFilesByKeyword(dir, keyword, reg)
  })

  // ipcMain.handle('media-paths-updated', (event, mediaPaths) => {
  //   return new Promise(resolve => {
  //     let audioFilePaths = mediaPaths.filter(({ isAudio }) => isAudio)
  //     let len = audioFilePaths.length
  //     // console.log(`len=========>${len}`);
  //     if (len === 0) {
  //       resolve({})
  //       return
  //     }

  //     let filePaths = audioFilePaths.map(({ filePath }) => filePath)
  //     console.log(`filePaths=${JSON.stringify(filePaths)}`);
  //     operationForAudioWaveCanvas.selection.SELECT_BY_FILE_PATHS(filePaths).then(audioWaveCanvases => {
  //       let canvasMap = {}
  //       audioWaveCanvases.forEach(audioWaveCanvas => {
  //         console.log(`audioWaveCanvas=${JSON.stringify(audioWaveCanvas)}`);
  //         canvasMap[audioWaveCanvas['filePath']] = audioWaveCanvas['canvasFilePath']
  //       })
  //       console.log(`canvasMap=${JSON.stringify(canvasMap)}`);
  //       resolve(canvasMap)
  //     })
  //   })
  // })

  // save the canvas image into local and add a corresponding record into DB
  const { sysFilesDir } = readJsonFile(path.join(app.getPath('userData'), DEFAULT_CONFIG_DEST)) || {}
  ipcMain.on('on-canvas-updated', (event, mediaBlob) => {
    const { filePath, blob } = mediaBlob

    let filename = filePath.substring(filePath.lastIndexOf('\\') + 1)
    filename = `${Date.now()}-${filename.substring(0, filename.lastIndexOf('.'))}.png`
    let fileObj = {
      'dirPath': path.join(sysFilesDir, DIR_FOR_SYS.WAVEFORM),
      'filename': filename,
      'fileData': blob,
      'originalFilePath': filePath
    }

    let audioWaveCanvas = [fileObj].map(({ dirPath, filename, originalFilePath }) => {
      return {
        'filePath': originalFilePath,
        'canvasFilePath': path.join(dirPath, filename)
      }
    })
    manageTransaction(
      async () => {
        // insert this information into t_audio_wave_canvas
        await operationForAudioWaveCanvas.insertion.INSERT_VALUES(audioWaveCanvas)
      },
      async () => {
        const filePath = path.join(fileObj.dirPath, fileObj.filename)
        console.log(`filePath======>${filePath}`);

        await fs.promises.writeFile(filePath, Buffer.from(fileObj.fileData));
      }
    )
  })

  ipcMain.handle('save-files', (event, fileObjs) => {
    return saveFiles(fileObjs)
  })

  ipcMain.handle('delete-file', (event, filePath) => {
    try {
      fs.unlinkSync(filePath)
      return true
    } catch (error) {
      return false
    }
  })

  ipcMain.handle('bind-global-shortcut', (event, info) => {
    const { shortcut, href } = info

    return bindGlobalShortcut(kits, href, shortcut)
  })

}
