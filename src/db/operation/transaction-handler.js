import { runTransaction, runSql } from '../init-db'
import { tableNameMap } from '../../js/constants'
import { operationForScriptRow } from './operation-4-script-row'
import { operationForVideo } from './operation-4-video'
import { operationForScriptBk } from './operation-4-script-bk'
import { operationForFileRank } from './operation-4-file-rank'

export const transactionHandler = {
  /**
   * refresh to store the current scripts into db
   * @param {Array} scripts the main data from the vue page named ScriptionCreation.vue
   * @param {Number} videoId the inferior data from the vue page named ScriptionCreation.vue
   */
  saveScriptRows: async (args) => {
    let scripts = args[0], videoId = args[1]
    await runTransaction(async () => {
      await operationForScriptRow.deletion.DELETE_BY_VIDEO_ID(videoId)
      for (let script of scripts) {
        // update the frequency of how many times the file used to db
        script['videoId'] = +videoId
        // if (script.filePath) {
        //   let updated = await operationForFileRank.update.ONE_PLUS_FREQ_BY_FILE_PATH(script.filePath)
        //   // insert instead of updating if there is no original one
        //   if (updated === 0) {
        //     operationForFileRank.insertion.INSERT_VALUE({
        //       filePath: script.filePath,
        //       freq: 1
        //     })
        //   }
        // }
      }
      await operationForScriptRow.insertion.INSERT_VALUES(scripts)
    })
    return scripts
  },
  /**
   * recreate script backup with 2 sql statements
   */
  recreateScriptBk: async () => {
    await runTransaction(async () => {
      await operationForScriptBk.createTable.RECREATE()
    })
  },
  /**
   * delete the ones of which n.o. is GT the n.o. in scriptBk passed
   * and insert the one of which n.o. equals to the n.o. in scriptBk passed
   * @param {Object} scriptBk the one used as condition
   */
  insertScriptBkAfterDeletion: async (args) => {
    let scriptBk = args[0]
    await runTransaction(async () => {
      await operationForScriptBk.deletion.DELETE_WHERE_NO_GT(scriptBk.no)
      await operationForScriptBk.insertion.INSERT_VALUE_WITH_NO(scriptBk)
    })
  },
}
