/**
 * for ScriptCreation.vue, set the number of rows when first entry
 */
export const DEFAULT_ROW_NUM = 8
export const ELECTRON_DIR = 'resource'
/**
 * the path where configurations are stored
 */
export const DEFAULT_CONFIG_DEST = `${ELECTRON_DIR}/config.json`
/**
 * the path where the database is
 */
export const DEFAULT_BD_DEST = `${ELECTRON_DIR}/vpro.db`
/**
 * the titles of a video script
 */
export const TITLES = ['大纲', '分镜', '文件路径', '台词文案', '备注', '创建时间', '修改时间']
/**
 * the bounds of window
 */
export const BOUNDS = {
  WIDTH: 1600,
  HEIGHT: 1200,
  MAX_WIDTH: 2000,
  MIN_WIDTH: 1200,
  MAX_HEIGHT: 1200,
  MIN_HEIGHT: 1200,
}

export const SPEC = {
  vueNames: {
    SCRIPT_CREATION: 'ScriptCreation',
    FILE_EXPLORER: 'FileExplorer',
  },
  type: {
   FILE_SHARE: 'FileShare'
  }
}

/**
 * database operation type
 */
export const OPERATION_TYPE = {
  DELETION: 'deletion',
  SELECTION: 'selection',
  UPDATE: 'update',
  INSERTION: 'insertion',
}

/**
 * a map where key is alias, value is the table name in db
 */
export const tableNameMap = {
  scriptRows: 't_script_row',
  video: 't_video',
  scriptBk: 't_script_bk',
  fileRank: 't_file_rank',
  globalShortcut: 't_global_shortcut',
}

/**
 * to mark status of something
 */
export const STATUS = {
  ORDINARY: '0',
  DELETED: '1',
}

/**
 * statistic for  all transactional operations
 */
export const TRANSACTIONS = {
  SAVE_SCRIPT_ROWS: 'saveScriptRows',
  RECREATE_SCRIPT_BK: 'recreateScriptBk',
  INSERT_SCRIPT_BK_AFTER_DELETION: 'insertScriptBkAfterDeletion',
}

export const EXTENSIONS = {
  // audition suffixes
  AUDIO: [".mp3", ".wav", ".flac", ".aac", ".ogg", ".wma", ".m4a"],
  // video suffixes
  VIDEO: [".mp4", ".avi", ".mkv", ".mov", ".wmv", ".flv", ".webm", ".m4v"],
  // image suffixes
  IMAGE: [".jpg", ".jpeg", ".png", ".gif", ".bmp", ".tiff", ".tif", ".webp", ".svg", ".ico"]
}

