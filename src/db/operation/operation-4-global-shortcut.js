import { runSql, generateInsertionStatement, generateUpdateStatement } from "../init-db"
import { OPERATION_TYPE, tableNameMap } from "@/js/constants"

const fieldsExceptId = ['keysCombination', 'href']

/**
 * database operation
 */
export const operationForGlobalShortcut = {
  insertion: {
    /**
     * insert objects into table with batch
     * @param {Array} globalShortcuts the objects to be isnerted into table 't_file_rank'
     * @returns {Number} the number of rows affected
     */
    INSERT_VALUE: (globalShortcuts) => {
      const sql = generateInsertionStatement(fieldsExceptId, globalShortcuts, tableNameMap.globalShortcut)
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
      DELETE FROM ${tableNameMap.globalShortcut}
      WHERE id IN
      ${'(' + idList.join(', ') + ')'}
      `
      return runSql(sql, OPERATION_TYPE.DELETION)
    },

  },
  selection: {
    SELECT_ALL: () => {
      const sql = `
      SELECT *
      FROM ${tableNameMap.globalShortcut}
      `
      return runSql(sql, OPERATION_TYPE.SELECTION)
    },
    SELECT_BY_KEYS_COMBINATION: (keysCombination) => {
      const sql = `
      SELECT *
      FROM ${tableNameMap.globalShortcut}
      WHERE keysCombination = '${keysCombination}'
      `
      return runSql(sql, OPERATION_TYPE.SELECTION).then(results => { return results[0] })
    },
    SELECT_BY_HREF: (href) => {
      const sql = `
      SELECT *
      FROM ${tableNameMap.globalShortcut}
      WHERE href = '${href}'
      `
      return runSql(sql, OPERATION_TYPE.SELECTION).then(results => { return results[0] })
    },

  },
  update: {
    /**
     * update a row by id
     * @param {Object} globalShortcut the global shortcut object used to update
     */
    UPDATE: (globalShortcut) => {
      const sql = generateUpdateStatement(fieldsExceptId, globalShortcut, tableNameMap.globalShortcut)
      return runSql(sql, OPERATION_TYPE.UPDATE)
    },
    /**
     * update a row by href
     * @param {Object} globalShortcut the one to be updated
     * @returns number of affected rows
     */
    UPDATE_BY_HREF: (globalShortcut) => {
      const sql = `
      UPDATE ${tableNameMap.globalShortcut} 
      SET keysCombination = '${globalShortcut.keysCombination}' 
      WHERE
        href = '${globalShortcut.href}'
      `
      return runSql(sql, OPERATION_TYPE.UPDATE)
    }
  }


}

