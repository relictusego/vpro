import { runSql, generateInsertionStatement, generateUpdateStatement } from "../init-db"
import { OPERATION_TYPE, tableNameMap } from "@/js/constants"

const fieldsExceptId = ['filePath', 'canvasFilePath']

/**
 * database operation
 */
export const operationForAudioWaveCanvas = {
  insertion: {
    /**
     * insert audioWaveCanvaes into table with batch
     * @param {Array} audioWaveCanvaes the objects to be isnerted into table 't_audio_wave_canvas'
     * @returns {Number} the number of rows affected
     */
    INSERT_VALUES: (audioWaveCanvaes) => {
      const sql = generateInsertionStatement(fieldsExceptId, audioWaveCanvaes, tableNameMap.audioWaveCanvas)
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
      DELETE FROM ${tableNameMap.audioWaveCanvas}
      WHERE id IN
      ${'(' + idList.join(', ') + ')'}
      `
      return runSql(sql, OPERATION_TYPE.DELETION)
    },
    DELETE_BY_FILE_PATH: (filePath) => {
      const sql = `
      DELETE FROM ${tableNameMap.audioWaveCanvas}
      WHERE filePath = ' ${filePath}'
      `
      return runSql(sql, OPERATION_TYPE.DELETION)
    },

  },
  selection: {
    /**
     * @returns all rows
    */
    SELECT_ALL: () => {
      const sql = `
      SELECT * FROM ${tableNameMap.audioWaveCanvas}
      `
      return runSql(sql, OPERATION_TYPE.SELECTION)
    },
    /**
     * find row of which id is specified
     * @param {Number} id condition for selection
     * @returns rows found by condition
    */
    SELECT_BY_ID: (id) => {
      const sql = `
      SELECT * FROM ${tableNameMap.audioWaveCanvas}
      WHERE id = ${id}  
      `
      return runSql(sql, OPERATION_TYPE.SELECTION).then(res => { return res[0] })
    },
    SELECT_BY_FILE_PATHS: (filePaths) => {
      const sql = `
      SELECT *
      FROM ${tableNameMap.audioWaveCanvas}
      WHERE filePath IN
      ${'(\'' + filePaths.join('\', \'') + '\')'}
      `
      return runSql(sql, OPERATION_TYPE.SELECTION)
    },
    SELECT_BY_FILE_PATH: (filePath) => {
      const sql = `
      SELECT *
      FROM ${tableNameMap.audioWaveCanvas}
      WHERE filePath = '${filePath}'
      `
      return runSql(sql, OPERATION_TYPE.SELECTION).then(res => { return res[0] })
    },

  },
  update: {
    
  }


}

