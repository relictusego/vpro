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
export function runSql(sql, type = OPERATION_TYPE.SELECTION) {
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
  });
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
        await runSql(DmlStatement.creation.CREATE_TABLE_t_script_row);
        await runSql(DmlStatement.creation.CREATE_TABLE_t_video);
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
export function valueTxtPart(dataList, fieldsToBeInserted){
  let values = []
  dataList.forEach(item => {
    let value = '('
    fieldsToBeInserted.forEach(field => {
      const fieldValue = item[field]
      if (fieldValue) {
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
* get the comleted sql for insertion that's able to insert with batch
* @param {Array} fieldsToBeInserted list fo fields of a row need to be inserted
* @param {Array} dataList list of dataa to be used in iteration
* @param {String} tableName the name of the table used
* @returns {String} the completed sql
*/
export function generateInsertionStatement(fieldsToBeInserted, dataList, tableName) {
  const filedsSelected = '(' + fieldsToBeInserted.join(', ') + ')'
  let values = valueTxtPart(dataList, fieldsToBeInserted)
  return `
  INSERT INTO ${tableName}
  ${filedsSelected}
  VALUES 
  ${values}
  `
}


export function generateUpdateStatement(fieldsToBeUpdate, data, tableName) {
  let part = ''
  fieldsToBeUpdate.forEach(field => {
    const fieldValue = data[field]
    if (fieldValue) {
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
  WHERE id = ${data['id']}
  `
}