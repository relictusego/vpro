import { EXTENSIONS } from "../constants"

/**
 *
 * @param {String} from where is the inform from
 * @param {String} to where does the inform go to
 * @param {String} type the type of inform
 * @param {String} data the data loaded on the inform
 * @returns
 */
export function newDataWithinVues(from, to, type, data) {
  return {
    'from': from,
    'to': to,
    'type': type,
    'data': data,
  }
}


/**
 * determine what's type of the file
 * @param {String} filePath filePath to determine what's type of the file with suffix
 * @returns {String} the type of the file
 */
export function mimeType(filePath) {
  if (filePath === null || filePath === undefined || filePath === '') return ''
  let suffix = filePath.substring(filePath.lastIndexOf('.'))
  const types = Object.keys(EXTENSIONS)
  for (const type of types) {
    if (EXTENSIONS[type].indexOf(suffix) >= 0) return type
  }
  return ''
}


/**
 * compute the similarity of two string
 * @param {String} str1 first string
 * @param {String} str2 second string
 * @returns similarity of the two
 */
 export function similarity(str1, str2) {
  const m = str1.length;
  const n = str2.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (str1[i - 1] === str2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  return dp[m][n] / Math.min(m, n)  
}

/**
 * do something after a period specified
 * @param {Number} ms number of millisecond 
 * @returns {Promise<void>}
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))