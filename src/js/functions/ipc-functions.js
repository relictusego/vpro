import fs from 'fs'
import path from 'path'
import util from 'util'

const readdir = util.promisify(fs.readdir)
const stat = util.promisify(fs.stat)


/**
 * Recursively search files by keyword in the specified directory.
 * 
 * @param {string} dir - The directory to start the search.
 * @param {string|RegExp} keyword - The keyword or regex to search for.
 * @param {boolean} [reg=false] - Whether to treat keyword as a regular expression.
 * @param {string[]} [extensions=[]] - Array of file extensions to include in the search.
 * @param {Array<string>} [result=[]] - Array to store the search results.
 * @returns {Promise<string[]>} - The array of file paths that match the keyword.
 */
export async function searchFilesByKeyword(dir, keyword, reg = false, extensions = [], result = []) {
  try {
    // Read the contents of the directory
    const filePaths = await readdir(dir);

    for (const filePath of filePaths) {
      const fullPath = path.join(dir, filePath);
      const stats = await stat(fullPath);

      if (stats.isDirectory()) {
        // Recursively search in the subdirectory
        await searchFilesByKeyword(fullPath, keyword, reg, extensions, result);
      } else {
        // Check file extension
        if (extensions.length === 0 || extensions.some(ext => filePath.endsWith(ext))) {
          const matches = reg 
            ? new RegExp(keyword).test(filePath) 
            : filePath.includes(keyword);

          if (matches) {
            result.push(fullPath);
          }
        }
      }
    }

    return result;
  } catch (error) {
    console.error(`Error searching files: ${error.message}`);
    return []; // Return an empty array on error
  }
}