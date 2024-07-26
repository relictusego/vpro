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
