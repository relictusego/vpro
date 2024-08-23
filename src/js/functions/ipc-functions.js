import fs from 'fs'
import path from 'path'
import util from 'util'
import { BOUNDS, HREFS_NTUC, ROUTER_HREF, EXTENSIONS } from '../constants'
import { globalVar } from '../global-var'
import { operationForGlobalShortcut } from '@/db/operation/operation-4-global-shortcut'

const readdir = util.promisify(fs.readdir)
const stat = util.promisify(fs.stat)

/**
 * Recursively search files by keyword in the specified directory.
 * 
 * @param {string} dir - The directory to start the search.
 * @param {string|RegExp} keyword - The keyword or regex to search for.
 * @param {boolean} [reg=false] - Whether to treat keyword as a regular expression.
 * @param {string[]} [extensions=[]] - Array of file extensions to include in the search.
 * @param {Array<string>} [result=[]] - Array to store the search results.
 * @returns {Promise<string[]>} - The array of file paths that match the keyword.
 */
export async function searchFilesByKeyword(dir, keyword, reg = false, extensions = [], result = []) {
  try {
    // Read the contents of the directory
    const filePaths = await readdir(dir);

    for (const filePath of filePaths) {
      const fullPath = path.join(dir, filePath);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        // Recursively search in the subdirectory
        await searchFilesByKeyword(fullPath, keyword, reg, extensions, result);
      } else {
        // Check file extension
        if (extensions.length === 0 || extensions.some(ext => filePath.endsWith(ext))) {
          const matches = reg
            ? new RegExp(keyword).test(filePath)
            : filePath.includes(keyword);

          if (matches) {
            result.push(fullPath);
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error(`Error searching files: ${error.message}`);
    return []; // Return an empty array on error
  }
}

/**
 * create a window with route link and location
 * @param {Object} kits necessary kits
 * @param {String} href the href of the route
 * @param {Object} bounds represents the location
 * @returns the window created
 */
export async function createNewWindow(kits, href, bounds) {
  const { BrowserWindow, preloadPath, ipcMain, Menu, dialog, fs, path, httpGet, httpsGet, app } = kits
  console.log('--created new window----');


  let newWindow = globalVar.urlWinMap[href]
  if (newWindow) {  // focus or shutdown window if it exists
    if (!newWindow.isFocused()) {
      // Bring the window to the top if it's not already focused
      newWindow.focus();
    } else {
      // update the location when window closed into DB, for the next opening
      const { x, y } = newWindow.getBounds()
      await operationForGlobalShortcut.update.UPDATE_WINDOW_LOCATION_BY_HREF({
        'href': href,
        'xAxis': x,
        'yAxis': y
      })

      newWindow.removeAllListeners('close');
      await handleUnmount(href)
      newWindow.destroy();
      delete globalVar.urlWinMap[href]
      newWindow = null
    }
  } else {  // create new window if it doesn't exist
    let { xAxis, yAxis } = await operationForGlobalShortcut.selection.SELECT_BY_HREF(href) || {}
    console.log(`{xAxis, yAxis}={${xAxis}, ${yAxis}}`);

    if (!xAxis && !yAxis) {
      xAxis = bounds.x
      yAxis = bounds.y
    }
    newWindow = new BrowserWindow({
      width: BOUNDS.WIDTH,
      height: BOUNDS.HEIGHT,
      x: xAxis,
      y: yAxis,
      webPreferences: {
        preload: preloadPath,
        nodeIntegration: process.env.ELECTRON_NODE_INTEGRATION,
        contextIsolation: !process.env.ELECTRON_NODE_INTEGRATION,
        enableRemoteModule: true,
        webSecurity: false,
      },
      autoHideMenuBar: true,
    });

    newWindow.setMaximumSize(BOUNDS.MAX_WIDTH, BOUNDS.MAX_HEIGHT)
    newWindow.setMinimumSize(BOUNDS.MIN_WIDTH, BOUNDS.MIN_HEIGHT)

    const url = process.env.WEBPACK_DEV_SERVER_URL
      ? `${process.env.WEBPACK_DEV_SERVER_URL}${href}`
      : `app://./index.html${href}`;

    newWindow.loadURL(url)
    newWindow.focus()

    // if the window is used for browsing, bind such event
    if (ROUTER_HREF.SiteBrowser === href) {
      // override new window creation so that the page will always refresh
      // on one page even if some hyperlinks were clicked
      newWindow.webContents.on('new-window', (event, url) => {
        event.preventDefault()  // Prevent the default behavior
        const info = {
          purpose: 'refreshUrl',
          data: url
        }
        newWindow.webContents.send('on-data-from-main-process', info)
      })

      newWindow.webContents.on('context-menu', (event, params) => {
        const { x, y } = params
        console.log(`Context menu triggered at position: (${x}, ${y})`);
        if (!params.srcURL) return

        const contextMenu = Menu.buildFromTemplate([
          {
            label: '保存媒体文件',
            click: async () => {
              if (params.srcURL) {
                const fileExplorerWindow = globalVar.urlWinMap[ROUTER_HREF.FileExplorer]
                if (!fileExplorerWindow) {
                  dialog.showMessageBox({
                    type: 'warning',
                    title: '文件浏览窗口未打开',
                    message: `保存功能需配合'文件浏览窗口'使用`,
                  });
                  return
                }

                const mediaCollectorInfo = {
                  purpose: 'showMediaCollector',
                  data: { x, y }
                }
                newWindow.webContents.send('on-data-from-main-process', mediaCollectorInfo)

                ipcMain.once('data-from-renderer', (event, mediaData) => {
                  console.log(`Received from renderer: ${JSON.stringify(mediaData)}`);
                  const dirPath = mediaData['dirPath']
                  const basename = `${mediaData['filename']}.${mediaData['suffix']}`
                  console.log(`${dirPath}, ${basename}`);
                  if (basename && dirPath) {
                    const filePath = path.join(dirPath, basename)
                    let func = String(params.srcURL).startsWith('https') ? httpsGet : httpGet
                    // Download and save the image
                    func(params.srcURL, (response) => {
                      const file = fs.createWriteStream(filePath);
                      response.pipe(file);

                      file.on('finish', () => {
                        file.close(() => {
                          const storageInfo = {
                            purpose: 'storageInform',
                            data: filePath
                          }
                          fileExplorerWindow.webContents.send('on-data-from-main-process', storageInfo)
                        });
                      });
                    }).on('error', (err) => {
                      dialog.showErrorBox('Download Error', `Failed to download image: ${err.message}`);
                    });
                  }
                });
              }
            },
          },
          {
            label: 'Show Image Path',
            click: () => {
              console.log('Image source URL:', params.srcURL);
            },
          }
        ]);
        contextMenu.popup(newWindow);
      });
    }

    // click 'x' on the top right to close window
    newWindow.on('close', async (event) => {
      // update the location when window closed into DB, for the next opening
      const { x, y } = newWindow.getBounds()
      await operationForGlobalShortcut.update.UPDATE_WINDOW_LOCATION_BY_HREF({
        'href': href,
        'xAxis': x,
        'yAxis': y
      })

      event.preventDefault()
      await handleUnmount(href)
      newWindow.removeAllListeners('close');
      newWindow.destroy();
      delete globalVar.urlWinMap[href]
      newWindow = null
    })

    globalVar.urlWinMap[href] = newWindow
  }

  return newWindow


  /**
   * unmount components via ipc if the window needs to be unmounted
   * @param {String} href the href of the current window
   * @returns promise
   */
  async function handleUnmount(href) {
    if (!HREFS_NTUC.includes(href)) {
      return Promise.resolve()
    }

    newWindow.webContents.send('on-unmount-components')
    // Wait for the unmounting to complete if needed
    return new Promise((resolve) => {
      ipcMain.once('unmount-components', (event, data) => {
        resolve()
      })
    });
  }

}

/**
 * Saves an array of files to the specified directories.
 *
 * @param {Array<Object>} fileObjs - An array of objects representing files to save.
 * @param {string} fileObjs[].dirPath - The directory path where the file should be saved.
 * @param {string} fileObjs[].filename - The name of the file to save.
 * @param {string|ArrayBuffer} fileObjs[].fileData - The file data to be written. This can be a string or an ArrayBuffer.
 *
 * @returns {Object} - An object containing arrays of successfully saved file paths and failed file paths.
 * @returns {string[]} return.savedFilePaths - An array of file paths that were successfully saved.
 * @returns {string[]} return.failedFilePaths - An array of file paths that failed to save.
 *
 * @throws {Error} Will throw an error if any file operation fails.
 */
export function saveFiles(fileObjs) {
  const savedFilePaths = []
  const failedFilePaths = []

  fileObjs.forEach(({ dirPath, filename, fileData }) => {
    const filePath = path.join(dirPath, filename)
    try {
      fs.writeFileSync(filePath, Buffer.from(fileData))
      savedFilePaths.push(filePath)
    } catch (error) {
      console.error(`Failed to save file ${filename}: ${error.message}`)
      failedFilePaths.push(filePath)
    }
  })

  // Return the paths of saved files and failed files separately
  return { savedFilePaths, failedFilePaths }
}

/**
 * Adds or updates rows in a JSON file.
 * 
 * This function reads an existing JSON file, updates it with the provided rows, 
 * and then writes the updated content back to the file. If the file does not exist, 
 * it will be created.
 * 
 * @param {Object} info - The information for adding rows to the JSON file.
 * @param {Array<Object>} info.rows - An array of objects, each containing `fieldName` and `fieldValue`.
 * @param {string} info.dest - The absolute destination path of the JSON file
 * @returns {boolean} - Returns `true` if the operation was successful, `false` otherwise.
 */
export function addRowsInJsonFile(info) {
  const { rows, dest } = info
  let contentObj = {}
  try {
    const str = fs.readFileSync(dest)
    contentObj = JSON.parse(str)
  } catch (e) {
    console.log(e);
  }
  rows.forEach(row => {
    contentObj[row.fieldName] = row.fieldValue
  })
  try {
    fs.writeFileSync(dest, JSON.stringify(contentObj, null, 2));
    return true
  } catch (error) {
    return false
  }
}

/**
 * Reads and parses a JSON file.
 * 
 * This function reads the content of a specified JSON file and parses it into a JavaScript object.
 * If the file cannot be read or parsed, it returns `null`.
 * 
 * @param {string} filePath - The absolute path to the JSON file to be read.
 * @returns {Object|null} - Returns the parsed object if successful, or `null` if an error occurs.
 */
export function readJsonFile(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(fileContent)
  } catch (error) {
    console.error('Error reading file:', error.message);
    return null
  }
}


