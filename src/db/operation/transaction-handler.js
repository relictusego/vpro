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

/**
 * Class representing a transaction manager for handling database transactions.
 */
class TransactionManager {
  constructor() {
    /**
     * @type {Function[]} Array to hold the queued operations for the transaction.
     */
    this.operations = [];
  }

  /**
   * Starts the transaction by executing the 'BEGIN' SQL statement.
   * @returns {Promise<TransactionManager>} A promise that resolves to the current instance of TransactionManager.
   */
  async start() {
    await runSql('BEGIN', null);
    return Promise.resolve(this);
  }

  /**
   * Queues an operation to be executed as part of the transaction.
   * @param {Function} cudProcess - A function representing a create, update, or delete operation.
   * @returns {TransactionManager} The current instance of TransactionManager, allowing for method chaining.
   */
  execute(cudProcess) {
    this.operations.push(cudProcess);
    return this;
  }

  /**
   * Executes all queued operations and commits the transaction if successful.
   * Rolls back the transaction if any operation fails.
   * @returns {Promise<void>} A promise that resolves if the transaction is successful, or rejects if it fails.
   * @throws {Error} If any operation fails, the transaction is rolled back and the error is re-thrown.
   */
  async run() {
    try {
      for (let operation of this.operations) {
        await operation(); // Ensure each operation is awaited
      }
      await runSql('COMMIT', null);
    } catch (error) {
      console.error('Error during transaction:', error);
      await runSql('ROLLBACK', null);
      throw error;
    }
  }
}

/**
 * Manages a transaction by queuing up operations and executing them within a transaction context.
 * @param {...Function} operations - Functions representing create, update, or delete operations to be executed.
 */
export function manageTransaction(...operations) {
  const transaction = new TransactionManager();

  transaction
    .start()
    .then((tm) => {
      for (const operation of operations) {
        tm.execute(operation);
      }
      return tm.run();
    })
    .then(() => console.log('Transaction process completed'))
    .catch((error) => console.error('Transaction process failed:', error));
}
