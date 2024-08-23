import { operationForGlobalShortcut } from "@/db/operation/operation-4-global-shortcut";
import { createNewWindow } from "../functions/ipc-functions";
import { ROUTER_HREF } from "../constants";

/**
 * bind global shortcut when the main app starts up
 * @param {Object} kits a map consists of kits in electron or node
 */
export function bindGlobalShortcutWhenStartsUp(kits) {
  const { globalShortcut, dialog } = kits
  operationForGlobalShortcut.selection.SELECT_ALL().then(globalShortcuts => {
    globalShortcuts.map(({ keysCombination, href, xAxis, yAxis }) => {
      if (xAxis === undefined || xAxis === null) xAxis = 0
      if (yAxis === undefined || yAxis === null) yAxis = 0
      // Register a global shortcut
      const ret = globalShortcut.register(keysCombination, () => {
        createNewWindow(kits, href, { x: xAxis, y: yAxis })
      });

      if (!ret) {
        throw new Error('Registration failed')
      }
    })
  })
}

/**
 * bind global shortcut in run time
 * @param {Object} kits a map consists of kits in electron or node
 * @param {String} href the href of a vue route
 * @param {String} keysCombination the keys combination for shortcut
*/
export async function bindGlobalShortcut(kits, href, keysCombination) {
  const { globalShortcut, dialog } = kits
  // Register a global shortcut
  const ret = globalShortcut.register(keysCombination, () => {
    // get the last bounds of the window and apply it for newly created window
    createNewWindow(kits, href, { x: 0, y: 0 })
  });

  if (!ret) {
    return {
      success: false,
      innerHTML: `<span style="font-weight: bold;">${keysCombination}</span>与已有热键冲突`
    }
  }

  // get the current keys combination of the current href, unregister it before update
  let row = await operationForGlobalShortcut.selection.SELECT_BY_HREF(href)

  if (row) {
    globalShortcut.unregister(row.keysCombination)
    // the current href has already been bound shortcut, update it
    row.keysCombination = keysCombination
    await operationForGlobalShortcut.update.UPDATE_BY_HREF(row)
    return {
      success: true,
      innerHTML: `<span style="font-weight: bold;">${keysCombination}</span>已绑定到当前界面`
    }
  } else {
    row = {
      'keysCombination': keysCombination,
      'href': href
    }
  }

  // here it's obvious that the current href has not been bound shortcut, insert
  let success = await operationForGlobalShortcut.insertion.INSERT_VALUE([row]).then((inserted) => {
    return inserted > 0
  }).catch(error => {
    return false
  })
  if (!success) {
    // unregister if failed to insert because of table unique constraint
    globalShortcut.unregister(keysCombination)
    return {
      success: false,
      innerHTML: `<span style="font-weight: bold;">${keysCombination}</span>已经绑定其他界面`
    }
  }

  return {
    success: true,
    innerHTML: `<span style="font-weight: bold;">${keysCombination}</span>已绑定到当前界面`
  }
}
