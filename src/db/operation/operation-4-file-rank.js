import { runSql, generateInsertionStatement, generateUpdateStatement } from "../init-db"
import { OPERATION_TYPE, tableNameMap } from "@/js/constants"

const fieldsExceptId = ['filePath', 'freq']

/**
 * database operation
 */
export const operationForFileRank = {
  insertion: {
    /**
     * insert a rank into table with batch
     * @param {Object} rank the object to be isnerted into table 't_file_rank'
     * @returns {Number} the number of rows affected
     */
    INSERT_VALUE: (rank) => {
      const sql = generateInsertionStatement(fieldsExceptId, [rank], tableNameMap.fileRank)
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
      DELETE FROM ${tableNameMap.fileRank}
      WHERE id IN
      ${'(' + idList.join(', ') + ')'}
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
      SELECT * FROM ${tableNameMap.fileRank}
      `
      return runSql(sql, OPERATION_TYPE.SELECTION)
    },
    /**
     * get an array of file rank object by specifying file paths
     * @param {Array<String>} filePaths 
     * @returns {Promise<Object>} resolve file rank object
    */
    SELECT_BY_FILE_PATHS: (filePaths) => {
      const sql = `
     SELECT * FROM ${tableNameMap.fileRank}
     WHERE filePath IN
     ${'(\'' + filePaths.join('\', \'') + '\')'}
     `
      return runSql(sql, OPERATION_TYPE.SELECTION)
    },
    /**
     * get an array of file rank object by specifying frequency
     * @param {Number} freq frequency of the usage of the file
     * @returns {Promise<Object>} resolve file rank object
     */
    SELECT_BY_FREQ: (freq) => {
      const sql = `
      SELECT
        * 
      FROM
        t_file_rank
      WHERE
        freq >= ${freq}
      `
      return runSql(sql, OPERATION_TYPE.SELECTION)
    }

  },
  update: {
    /**
     * update a row by id
     * @param {Object} rank the video object used to update
     */
    UPDATE: (rank) => {
      const sql = generateUpdateStatement(fieldsExceptId, rank, tableNameMap.fileRank)
      return runSql(sql, OPERATION_TYPE.UPDATE)
    },
    /**
     * plus one for rank's freq by specifying file path
     * @param {String} filePath the file path specified to plus one for rank's freq
     * @returns {Promise<any>} - A promise that resolves with the query result
     */
    ONE_PLUS_FREQ_BY_FILE_PATH: function (filePath) {
      const sql = `
      UPDATE ${tableNameMap.fileRank} 
      SET freq = (
          SELECT freq + 1 
          FROM ${tableNameMap.fileRank} 
          WHERE filePath = '${filePath}'
        )
      WHERE filePath = '${filePath}'
      `
      return runSql(sql, OPERATION_TYPE.UPDATE).then(updated => {
        if (updated === 0) {
          return operationForFileRank.insertion.INSERT_VALUE({ filePath: filePath, freq: 1 });
        }
      })
    }
  }


}

