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
 * @param {String} str1 - first string
 * @param {String} str2 - second string
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


/**
 * Convert seconds into a formatted time string (HH:MM:SS or MM:SS or SS).
 *
 * @param {number} seconds - The total number of seconds to convert.
 * @returns {string} - The formatted time string.
 */
export function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const hoursStr = hours > 0 ? `${hours}:` : '';
  const minutesStr = hours > 0 || minutes > 0 ? `${minutes < 10 && hours > 0 ? '0' : ''}${minutes}:` : '';
  const secondsStr = `${secs < 10 && (hours > 0 || minutes > 0) ? '0' : ''}${secs}`;

  return `${hoursStr}${minutesStr}${secondsStr}`;
}


/**
 * Draws a line on the given canvas rendering context.
 *
 * @param {CanvasRenderingContext2D} ctx - The 2D rendering context of the canvas.
 * @param {number} startX - The x-coordinate of the starting point of the line.
 * @param {number} startY - The y-coordinate of the starting point of the line.
 * @param {number} endX - The x-coordinate of the ending point of the line.
 * @param {number} endY - The y-coordinate of the ending point of the line.
 * @param {string} style - The color or style of the line (e.g., "#ff0000" for red).
 */
export function drawLine(ctx, startX, startY, endX, endY, style) {
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.strokeStyle = style;
  ctx.stroke();
}


/**
 * Executes a function repeatedly during a specified time period.
 * Would be interrupted if the result of the callback is true.
 * 
 * @param {number} time - The duration in milliseconds for which the function should be executed.
 * @param {Function} func - The function to execute repeatedly during the specified period.
 * @param {number} interval - The interval between every two loops, default 0
 */
export function loopInPeriod(time, func, interval = 0) {
  return new Promise((resolve) => {
    // Repeatedly call func as fast as possible
    const intervalId = setInterval(() => {
      func((result) => {
        if (result) {
          // Stop the interval if result is not null
          clearInterval(intervalId);
          resolve(true)
        }
      })
    }, interval)

    // Stop the repeated execution after the specified time
    delay(time).then(() => clearInterval(intervalId)).then(() => resolve(false))
  })
}


/**
 * debounced function to keep execution times in a period(debounce time)
 *
 * @param {Object} debounceObj - Object containing the timeout ID.
 * @param {Function} func - The function to debounce.
 * @param {number} time - The debounce time in milliseconds.
 */
export function debounce(debounceObj, func, time) {
  // Clear the previous timeout if the user is still typing
  if (debounceObj.timeoutId) {
    clearTimeout(debounceObj.timeoutId)
  }

  // Set a new timeout to delay the function execution
  debounceObj.timeoutId = setTimeout(() => {
    func()
  }, time);
}