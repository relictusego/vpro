import fs from 'fs'
import path from 'path'
import util from 'util'

const readdir = util.promisify(fs.readdir)
const stat = util.promisify(fs.stat)

/**
 * Recursively search for files containing a keyword in their names.
 * @param {string} dir - Directory to search in.
 * @param {string} keyword - Keyword to search for in file names.
 * @param {Array} result - Array to store the result paths.
 * @returns {Promise<Array>} - A promise that resolves with an array of file paths.
 */
export async function searchFilesByKeyword(dir, keyword, result = []) {
  try {
      const files = await readdir(dir)

      for (const file of files) {
          const fullPath = path.join(dir, file)
          const stats = await stat(fullPath)

          if (stats.isDirectory()) {
              await searchFilesByKeyword(fullPath, keyword, result)
          } else if (file.includes(keyword)) {
              result.push(fullPath)
          }
      }

      return result
  } catch (error) {
      console.error(`Error searching files: ${error.message}`)
      return []  // Return an empty array on error
  }
}