const sqlite3 = require('sqlite3').verbose();
const path = require('path');
import { DEFAULT_BD_DEST } from '@/js/constants'
import { DmlStatement } from './sql-4-init';
import { OPERATION_TYPE } from '@/js/constants';


let db

/**
 * run a sql
 * @param {String} sql the sql to be executed
 * @param {String} type the type of the operation to db
 * @returns {Number|Object} number of rows affected if DML else the result selected
 */
export function runSql(sql, type) {
  return new Promise((resolve, reject) => {
    if (type === OPERATION_TYPE.SELECTION) {
      db.all(sql, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows); // Pass the result set as the result
        }
      });
    } else {
      db.run(sql, function (err) {
        if (err) {
          reject(err);
        } else {
          resolve(this.changes); // Pass the number of changes as the result
        }
      });
    }
  })
}

/**
 * Run SQL statements within a transaction
 * @param {function} transact - multiple stock to be executed
 * @returns {Promise<void>} - Resolves when all statements are executed or rejects if an error occurs
 */
export async function runTransaction(transact) {
  return new Promise((resolve, reject) => {
    db.serialize(async () => {
      try {
        // Start the transaction
        await runSql('BEGIN', null);

        console.log('------------transaction executed--------------');
        await transact()

        // Commit the transaction
        await runSql('COMMIT', null);
        resolve();
      } catch (error) {
        console.log('------------transaction exception--------------');
        // Rollback in case of error
        await runSql('ROLLBACK', null);
        reject(error);
      }
    });
  });
}

/**
 * initialize database
 * @param {Object} app the application of electron
 */
export async function initDb(app) {
  const dbPath = path.join(app.getPath('userData'), DEFAULT_BD_DEST);

  db = new sqlite3.Database(dbPath, async (err) => {
    if (err) {
      console.error('Error opening database:', err.message);
    } else {
      console.log('Connected to the SQLite database.');
      // Create a table
      try {
        // TODO need to add await when publish
        runSql(DmlStatement.creation.CREATE_TABLE_t_script_row);
        runSql(DmlStatement.creation.CREATE_TABLE_t_video);
        runSql(DmlStatement.creation.CREATE_TABLE_t_file_rank);
        runSql(DmlStatement.creation.CREATE_TABLE_t_global_shortcut);
        runSql(DmlStatement.creation.CREATE_TABLE_t_audio_wave_canvas);
      } catch (e) {
        // pass
        // console.log(e);
      }
    }
  });
}

/**
 * complete the remained after keyword 'VALUES'
 * @param {Array} dataList list of data to be used in iteration
 * @param {Array} fieldsToBeInserted list of fields of a row need to be inserted
 * @returns {String} the remained part of the sql being executed after keyword 'VALUES'
 */
export function valueTxtPart(dataList, fieldsToBeInserted) {
  let values = []
  dataList.forEach(item => {
    let value = '('
    fieldsToBeInserted.forEach(field => {
      const fieldValue = item[field]
      if (fieldValue !== undefined && fieldValue !== null) {
        if (typeof fieldValue === 'number') {
          value += `${fieldValue}, `
        } else {
          value += `'${fieldValue}', `
        }
      } else {
        value += 'null, '
      }
    })
    value = value.substring(0, value.lastIndexOf(', ')) + ')'
    values.push(value)
  });
  return values.join(', \n    ')
}

/**
* get the completed sql for insertion that's able to insert with batch
* @param {Array} fieldsToBeInserted list of fields of a row need to be inserted
* @param {Array} dataList list of data to be used in iteration
* @param {String} tableName the name of the table used
* @returns {String} the completed sql
*/
export function generateInsertionStatement(fieldsToBeInserted, dataList, tableName) {
  const fieldsSelected = '(' + fieldsToBeInserted.join(', ') + ')'
  let values = valueTxtPart(dataList, fieldsToBeInserted)
  return `
  INSERT INTO ${tableName}
  ${fieldsSelected}
  VALUES 
  ${values}
  `
}

/**
 * Generates an SQL UPDATE statement based on provided fields and data.
 * 
 * This function creates an SQL UPDATE statement for a specified table, updating only 
 * the fields that are provided in the `fieldsToBeUpdate` array. It supports both string 
 * and number data types, and sets missing fields to `null`.
 * 
 * @param {string[]} fieldsToBeUpdate - An array of field names to be updated in the SQL statement.
 * @param {Object} data - An object containing the data to be used for the update, where keys correspond to field names.
 * @param {string} tableName - The name of the table in which the update will be performed.
 * @param {string} [conditionFieldName='id'] - The field name to be used in the WHERE clause for the condition, defaulting to 'id'.
 * @returns {string} - The generated SQL UPDATE statement as a string.
 */
export function generateUpdateStatement(fieldsToBeUpdate, data, tableName, conditionFieldName = 'id') {
  let part = ''
  let conditionFieldValue = data[conditionFieldName]
  if (typeof conditionFieldValue === 'string') {
    conditionFieldValue = `'${conditionFieldValue}'`
  }
  fieldsToBeUpdate.forEach(field => {
    const fieldValue = data[field]
    if (fieldValue !== undefined && fieldValue !== null) {
      if (typeof fieldValue === 'number') {
        part += `${field} = ${fieldValue}, \n`
      } else {
        part += `${field} = '${fieldValue}', \n`
      }
    } else {
      part += `${field} = null, `
    }
  })
  part = part.substring(0, part.lastIndexOf(','))
  return `
  UPDATE ${tableName} SET
  ${part}
  WHERE ${conditionFieldName} = ${conditionFieldValue}
  `
}