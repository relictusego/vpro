import { runTransaction, runSql } from '../init-db'
import { tableNameMap } from '../../js/constants'
import { operationForScriptRow } from '@/db/operation/operation-4-script-row'
import { operationForVideo } from '@/db/operation/operation-4-video'
import { operationForScriptBk } from '@/db/operation/operation-4-script-bk'

export const transactionHandler = {
  /**
   * refresh to store the current scripts into db
   * @param {Array} scripts the main data from vue page named ScriptionCreation.vue
   * @param {Number} videoId the inferior data from vue page named ScriptionCreation.vue
   */
  saveScriptRows: async (args) => {
    let scripts = args[0], videoId = args[1]
    await runTransaction(async () => {
      await operationForScriptRow.deletion.DELETE_BY_VIDEO_ID(videoId)
      scripts.forEach(script => {
        script['videoId'] = +videoId
      })
      await operationForScriptRow.insertion.INSERT_VALUES(scripts)
    })
    return scripts 
  },
  /**
   * recreate script backup with 2 sql statements
   */
  receateScriptBk: async () => {
    await runTransaction(async () => {
      await operationForScriptBk.createTable.RECREATE()
    })
  },
  /**
   * delete the ones of which no is GT the no in scriptBk passed
   * and insert the one of which no equals to the no in scriptBk passed
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