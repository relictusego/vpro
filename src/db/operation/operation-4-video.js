import { runSql,  generateInsertionStatement, generateUpdateStatement } from "../init-db"
import { OPERATION_TYPE, tableNameMap } from "@/js/constants"

const fieldsExceptId = ['name', 'description', 'status', 'createdTime', 'modifiedTime']

/**
 * database operation
 */
export const operationForVideo = {
  insertion: {
    /**
     * insert videos into table with batch
     * @param {Array} videos the objects to be isnerted into table 't_video'
     * @returns {Number} the number of rows affected
     */
    INSERT_VALUES: (videos) => {
      const sql = generateInsertionStatement(fieldsExceptId, videos, tableNameMap.video)
      // runSql(sql)
      return runSql(sql, OPERATION_TYPE.INSERTION)
    },
  },
  deletion: {
    /**
     * delete the rows of which id is in the range named idList
     * @param {Number} idList the list consits of ids that are about to be deleted
     * @returns {Number} the number of rows affected
     */
    DELETE_BY_IDS: (idList) => {
      const sql = `
      DELETE FROM ${tableNameMap.video}
      WHERE id IN
      ${ '(' + idList.join(', ') + ')' }
      `
      return runSql(sql, OPERATION_TYPE.DELETION)
    },

  },
  selection: {
    /**
     * find script rows of which video id is specified
     * @param {Number} id condition for selection
     * @returns script rows found by condition
    */
   SELECT_BY_ID: (id) => {
     const sql = `
     SELECT * FROM ${tableNameMap.video}
     WHERE id = ${id}  
     `
     return runSql(sql).then(res => {return res[0]})
    },
    /**
     * @param {String} status condition for selection
     * @returns all videos in the database
     */
    SELECT_ALL_WITH_STATUS: (status) => {
      const sql = `
      SELECT * FROM ${tableNameMap.video}
      WHERE status = '${status}'
      `
      return runSql(sql)
    },
    /**
     * @returns an array of objects of which structure is {'id': 1}
     */
    SELECT_NEWEST_ID: () => {
      const sql = `
      SELECT id FROM ${tableNameMap.video}
      ORDER BY id
      DESC
      LIMIT 0, 1
      `
      return runSql(sql).then(res => {return res[0]['id']})
    }
  },
  update: {
    /**
     * update a row by id
     * @param {Object} video the video object used to update
     */
    UPDATE: (video) => {
      const sql = generateUpdateStatement(fieldsExceptId, video, tableNameMap.video)
      return runSql(sql)
    }
  }
  

 }

