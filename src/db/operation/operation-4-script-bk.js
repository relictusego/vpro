import { runSql,  generateInsertionStatement, generateUpdateStatement } from "../init-db"
import { OPERATION_TYPE, tableNameMap } from "@/js/constants"
import { DmlStatement } from "../sql-4-init"

const fieldsExceptId = ['txt', 'type', 'no', 'modifiedTime']

/**
 * database operation
 */
export const operationForScriptBk = {
  insertion: {
    /**
     * insert scriptBks into table with batch
     * @param {Array} scriptBks the objects to be isnerted into table 't_script_bk'
     * @returns {Number} the number of rows affected
     */
    INSERT_VALUES: (scriptBks) => {
      const sql = generateInsertionStatement(fieldsExceptId, scriptBks, tableNameMap.scriptBk)
      // runSql(sql)
      return runSql(sql, OPERATION_TYPE.INSERTION)
    },
    INSERT_VALUE_WITH_NO: (scriptBk) => {
      const fieldPart = fieldsExceptId.join(', ')
      let valuePart = '('
      fieldsExceptId.forEach(field => {
        if (field === 'no') {
          valuePart += `(SELECT COALESCE(MAX(no), 0) + 1 FROM ${tableNameMap.scriptBk}), `
        } else {
          const fieldValue = scriptBk[field]
          if (fieldValue) {
            if (typeof fieldValue === 'number') {
              valuePart += `${fieldValue}, `
            } else {
              valuePart += `'${fieldValue}', `
            }
          } else {
            valuePart += 'null, '
          }
        }
      })
      valuePart = valuePart.substring(0, valuePart.lastIndexOf(', ')) + ')' 
      const sql = `
      INSERT INTO ${tableNameMap.scriptBk} (${fieldPart})
      VALUES
        ${valuePart}
      `
      console.log(`INSERT_VALUE_WITH_NO ===== sql ------> ${sql}`);
      return runSql(sql, OPERATION_TYPE.INSERTION)
    }
  },
  deletion: {
    /**
     * delete the rows of which id is in the range named idList
     * @param {Number} idList the list consists of ids that are about to be deleted
     * @returns {Number} the number of rows affected
     */
    DELETE_BY_IDS: (idList) => {
      const sql = `
      DELETE FROM ${tableNameMap.scriptBk}
      WHERE id IN
      ${ '(' + idList.join(', ') + ')' }
      `
      return runSql(sql, OPERATION_TYPE.DELETION)
    },
    /**
     * delete the ones of which id is GT the id passed as arg
     * @param {Number} no the condition
     */
    DELETE_WHERE_NO_GT: (no) => {
      const sql = `
      DELETE FROM ${tableNameMap.scriptBk}
      WHERE no > ${no}
      `
      return runSql(sql, OPERATION_TYPE.DELETION).then(res => {return res})
    }

  },
  selection: {
    /**
     * @param {Number} id for specifying the one selected
     * @returns the one selected
     */
    SELECT_BY_ID: (id) => {
      const sql = `
      SELECT * FROM ${tableNameMap.scriptBk}
      WHERE id = ${id}
      `
      console.log('sql-=+====>', sql);
      return runSql(sql, OPERATION_TYPE.SELECTION).then(res => {return res[0]})
    },
    COUNT: () => {
      const sql = `
      SELECT COUNT(*) FROM ${tableNameMap.scriptBk}
      `
      return runSql(sql, OPERATION_TYPE.SELECTION).then(res => {return res[0]["COUNT(*)"]})
    },
    SELECT_BY_NO: (no) => {
      const sql = `
      SELECT * FROM ${tableNameMap.scriptBk}
      WHERE no = ${no}
      `
      return runSql(sql, OPERATION_TYPE.SELECTION).then(res => {return res[0]})
    }
  },
  update: {
    UPDATE_SCRIPT_BK: (scriptBk) => {
      scriptBk.modifiedTime = Date.now()
      const sql = generateUpdateStatement(fieldsExceptId, scriptBk, tableNameMap.scriptBk)
      runSql(sql, OPERATION_TYPE.UPDATE)
    }
  },
  createTable: {
    RECREATE: async () => {
      await runSql(DmlStatement.deletion.DROP_TABLE_IF_EXISTS_t_script_bk)
      await runSql(DmlStatement.creation.CREATE_TABLE_t_script_bk)
    }
  }
  

 }

