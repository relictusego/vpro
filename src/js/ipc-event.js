import { BOUNDS, tableNameMap } from './constants'
import { operationForScriptRow } from '@/db/operation/operation-4-script-row'
import { operationForVideo } from '@/db/operation/operation-4-video'
import { operationForScriptBk } from '@/db/operation/operation-4-script-bk'
import { operationForFileRank } from '@/db/operation/operation-4-file-rank'
import { transactionHandler } from '@/db/operation/transaction-handler'
import { searchFilesByKeyword } from './functions/ipc-functions'
import util from 'util'

export function bindEventWithIpc(kit) {
  const { app, protocol, BrowserWindow, ipcMain, shell, path, fs, preloadPath, dialog } = kit

  // write one video info into local file
  ipcMain.on('add-row-in-json-file', (event, videoInfo) => {
    console.log(videoInfo);
    const { fieldName, fieldValue, dest } = JSON.parse(videoInfo);
    // console.log(`videoName = ${videoName}`);
    // console.log(`scripts=====> ${JSON.stringify(scripts, null, 2)}`);
    const filePath = path.join(app.getPath('userData'), dest)
    let contentObj = {}
    try {
      const str = fs.readFileSync(filePath)
      // console.log(`str=${str}`);
      contentObj = JSON.parse(str)
    } catch (e) {
      console.log(e);
    }
    contentObj[fieldName] = fieldValue;
    console.log(`filePath ===> ${filePath}`);
    console.log(contentObj);
    fs.writeFileSync(filePath, JSON.stringify(contentObj, null, 2));
  })

  // read local file
  ipcMain.handle('f-r', (event, filePath) => {
    try {
      filePath = path.join(app.getPath('userData'), filePath)
      const fileContent = fs.readFileSync(filePath, 'utf-8');
      return fileContent
    } catch (error) {
      console.error('Error reading file:', error.message);
      return null
    }
  })

  // write text into local file
  ipcMain.on('f-w', (event, textInfo) => {
    console.log(textInfo);
    const { text, dest } = JSON.parse(textInfo);
    const regex = /^[A-Z]:\\/
    let filePath
    if (regex.test(dest)) {
      filePath = dest
    } else {
      filePath = path.join(app.getPath('userData'), dest)
    }

    // TODO 记录上次打开文件夹路径
    // console.log(`filePath ===> ${filePath}`);
    fs.writeFileSync(filePath, text);
  })

  // locate file in os
  ipcMain.on('locate-file-in-os', (event, filePath) => {
    if (filePath) {
      shell.showItemInFolder(filePath); // 打开文件所在文件夹并选中文件
    }
  });

  ipcMain.handle('subfiles-in-dir', async (event, rootPath) => {
    const stat = util.promisify(fs.stat)
    let paths = [];
    console.log(`rootPath====${rootPath}`);
    const stats = await stat(rootPath)
    // return empty arr if is a file
    if (stats.isFile()) return paths

    fs.readdirSync(rootPath).forEach(file => {
      const fullPath = path.join(rootPath, file);
      paths.push(fullPath);
    });
    return paths;
  })

  ipcMain.on('update-data-within-vues', (event, data) => {

    ////
    console.log(JSON.stringify(data));
    BrowserWindow.getAllWindows().forEach(win => {
      win.webContents.send('on-data-within-vues', data);
    });
  })


  function createNewWindow(route, bounds) {
    let newWindow = new BrowserWindow({
      width: BOUNDS.WIDTH,
      height: BOUNDS.HEIGHT,
      x: bounds.x,
      y: bounds.y,
      webPreferences: {
        preload: preloadPath,
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
        contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
        enableRemoteModule: true,
        webSecurity: false,
      },
      autoHideMenuBar: true
    });

    const url = process.env.WEBPACK_DEV_SERVER_URL
      ? `${process.env.WEBPACK_DEV_SERVER_URL}#/${route}`
      : `app://./index.html#/${route}`;


    // const filePath = path.join(app.getPath('userData'), 'url.txt')

    // console.log(`filePath ===> ${filePath}`);
    // fs.appendFileSync(filePath, url + '\r\n');
    newWindow.loadURL(url);
  }


  ipcMain.on('open-new-window', (event, windowInfo) => {
    try {
      const { url, bounds } = JSON.parse(windowInfo)
      // place FileExplorer on the left of ScriptCreation
      bounds.x -= BOUNDS.WIDTH
      createNewWindow(url, bounds)
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

  ipcMain.handle('execute-sql', (event, info) => {
    console.log(info);
    const { tableName, operation, funcName, data } = JSON.parse(info)
    const func = operationMap[tableName][operation][funcName]
    console.log(func);
    if (data === null || data === undefined) {
      return func()
    } else {
      return func(data)
    }
  });

  ipcMain.handle('transact', (event, transactionInfo) => {
    const { method, args } = JSON.parse(transactionInfo)
    const func = transactionHandler[method]
    return func(args)
  });

  ipcMain.handle('file-search', (event, info) => {
    const { dir, keyword } = JSON.parse(info)
    console.log(`dir===${dir}`);
    return searchFilesByKeyword(dir, keyword)
  })

}
