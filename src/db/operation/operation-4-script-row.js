import { runSql,  generateInsertionStatement } from "../init-db"
import { OPERATION_TYPE, tableNameMap } from "@/js/constants"

/**
 * database operation
 */
export const operationForScriptRow = {
  insertion: {
    /**
     * insert scriptRows into table with batch
     * @param {Array} scriptRows the objects to be isnerted into table 't_script_row'
     * @returns {Promise<any>} - A promise that resolves with the query result
     */
    INSERT_VALUES: (scriptRows) => {
      const fieldsToBeInserted = ['outline', 'storyBoard', 'filePath', 'subtitle', 'comment', 'videoId', 'no', 'status', 'createdTime', 'modifiedTime']
      const sql = generateInsertionStatement(fieldsToBeInserted, scriptRows, tableNameMap.scriptRows)
      // runSql(sql)
      return runSql(sql, OPERATION_TYPE.INSERTION)
    },
  },
  deletion: {
    /**
     * delete the rows of which id is in the range named idList
     * @param {Number} idList the list consists of ids that are about to be deleted
     * @returns {Number} the number of rows affected
     */
    DELETE_BY_IDS: (idList) => {
      const sql = `
      DELETE FROM ${tableNameMap.scriptRows}
      WHERE id IN
      ${ '(' + idList.join(', ') + ')' }
      `
      return runSql(sql, OPERATION_TYPE.DELETION)
    },
    /**
     * delete by video id
     * @param {Number} videoId condition for deletion
     * @returns {Promise<any>} - A promise that resolves with the query result
     */
    DELETE_BY_VIDEO_ID: (videoId) => {
      const sql = `
      DELETE FROM ${tableNameMap.scriptRows}
      WHERE videoId = ${videoId} 
      `
      return runSql(sql, OPERATION_TYPE.DELETION)
    }
  },
  selection: {
    /**
     * find script rows of which video id is specified
     * @param {Number} videoId condition for selection
     * @returns script rows found by condition
     */
    SELECT_BY_VIDEO_ID: (videoId) => {
      const sql = `
      SELECT * FROM ${tableNameMap.scriptRows}
      WHERE videoId = ${videoId}  
      ORDER BY id
      `
      return runSql(sql, OPERATION_TYPE.SELECTION)
    }
  }


 }

