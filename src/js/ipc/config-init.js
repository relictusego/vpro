import { addRowsInJsonFile, readJsonFile } from "../functions/ipc-functions"
import { operationForAudioWaveCanvas } from '@/db/operation/operation-4-audio-wave-canvas'
import { operationForFileRank } from '@/db/operation/operation-4-file-rank'
import fs from 'fs'
import { DEFAULT_CONFIG_DEST, DEFAULT_SYS_DIR, CONFIG_FIELD_NAMES, DIR_FOR_SYS } from "../constants"

/**
 * Removes deprecated files from the database.
 * 
 * This function checks the validity of file paths stored in the database.
 * If a file no longer exists, its corresponding record is deleted from the database.
 * 
 * @returns {void}
 */
export function removeDeprecatedFilesInDB() {
  operationForAudioWaveCanvas.selection.SELECT_ALL().then(audioWaveCanvases => {
    let ids = audioWaveCanvases.map(({ filePath, canvasFilePath, id }) => {
      if (!fs.existsSync(filePath) || !fs.existsSync(canvasFilePath)) {
        return id
      }
    }).filter(id => id !== undefined)

    operationForAudioWaveCanvas.deletion.DELETE_BY_IDS(ids)
  })

  operationForFileRank.selection.SELECT_ALL().then(fileRanks => {
    let ids = fileRanks.map(({ filePath, id }) => {
      if (!fs.existsSync(filePath)) {
        return id
      }
    }).filter(id => id !== undefined)
    operationForFileRank.deletion.DELETE_BY_IDS(ids)
  })
}

/**
 * Initializes the configuration file for the application.
 * 
 * This function checks if a configuration file exists in the user's data directory. 
 * If it does, it ensures that the `sysFilesDir` property is set. If not, it prompts 
 * the user to select a directory for system files, or creates a default directory if 
 * the user cancels the dialog.
 * 
 * @param {Object} kits - The necessary modules and utilities for the function.
 * @param {Object} kits.app - The Electron app module to access the user's data directory.
 * @param {Object} kits.dialog - The Electron dialog module for showing dialogs.
 * @param {Object} kits.path - The Node.js path module for working with file and directory paths.
 * @returns {Promise<void>} - A promise that resolves once the configuration file has been initialized.
 */
export async function initConfigFile(kits) {
  const { app, dialog, path } = kits
  let destDir = path.join(app.getPath('userData'), DEFAULT_CONFIG_DEST)
  // console.log(destDir);
  
  let jsonObj = readJsonFile(destDir)
  if (jsonObj !== null) {
    const { sysFilesDir } = jsonObj
    if (sysFilesDir === undefined || sysFilesDir === null) {
      const dialogInfo = {
        title: '指定系统文件路径',
        properties: ['openDirectory'],
      }
      const result = await dialog.showOpenDialog(dialogInfo)
      // default to C disk if user doesn't set
      let sysFileDir = path.join(app.getPath('userData'), DEFAULT_SYS_DIR)
      if (result.canceled) {
        fs.mkdirSync(sysFileDir)
      } else {
        sysFileDir = result.filePaths[0]
      }
      fs.mkdirSync(path.join(sysFileDir, DIR_FOR_SYS.WAVEFORM))
      fs.mkdirSync(path.join(sysFileDir, DIR_FOR_SYS.GARBAGE))

      addRowsInJsonFile({
        rows: [
          {
            fieldName: CONFIG_FIELD_NAMES.SYS_FILES_DIR,
            fieldValue: sysFileDir
          }
        ],
        dest: destDir
      })
    }
  }
}