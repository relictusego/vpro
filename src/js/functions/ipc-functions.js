import fs from 'fs'
import path, { resolve } from 'path'
import util from 'util'
import { BOUNDS, HREFS_NTUC } from '../constants'
import { GlobalVar } from '../global-var'

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
  const { BrowserWindow, preloadPath, ipcMain } = kits

  let newWindow = GlobalVar.UrlWinMap[href]
  if (newWindow) {
    newWindow.removeAllListeners('close');
    await handleUnmount(href)
    newWindow.destroy();
    delete GlobalVar.UrlWinMap[href]
    newWindow = null
  } else {
    newWindow = new BrowserWindow({
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
      autoHideMenuBar: true,
    });

    newWindow.setMaximumSize(BOUNDS.MAX_WIDTH, BOUNDS.MAX_HEIGHT)
    newWindow.setMinimumSize(BOUNDS.MIN_WIDTH, BOUNDS.MIN_HEIGHT)

    const url = process.env.WEBPACK_DEV_SERVER_URL
      ? `${process.env.WEBPACK_DEV_SERVER_URL}${href}`
      : `app://./index.html${href}`;

    newWindow.loadURL(url)
    newWindow.focus()

    // Override the default close behavior
    newWindow.on('close', async (event) => {
      event.preventDefault()
      await handleUnmount(href)
      newWindow.removeAllListeners('close');
      newWindow.destroy();
      delete GlobalVar.UrlWinMap[href]
      newWindow = null
    })

    GlobalVar.UrlWinMap[href] = newWindow
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
