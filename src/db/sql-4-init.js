import { tableNameMap } from "@/js/constants" 
 
export const DmlStatement = {
  creation: {
    CREATE_TABLE_t_script_row : `
    CREATE TABLE ${tableNameMap.scriptRows} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 主键id，自增
      outline TEXT,                          -- 大纲
      storyBoard TEXT,                       -- 分镜
      filePath TEXT,                         -- 文件路径
      subtitle TEXT,                         -- 台词文案
      comment TEXT,                          -- 备注
      videoId INTEGER,                       -- 视频id
      no INTEGER,                            -- 顺序号 
      status INTEGER,                        -- 状态
      createdTime TEXT,                      -- 创建时间
      modifiedTime TEXT                      -- 修改时间
    );
  `,
  CREATE_TABLE_t_video: `
    CREATE TABLE ${tableNameMap.video} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 主键id，自增
      name TEXT,                             -- 视频名
      description TEXT,                      -- 描述
      status TEXT,                           -- 状态: 0-正常，1-删除
      createdTime TEXT,                      -- 创建时间
      modifiedTime TEXT                      -- 修改时间
    );
  `,
  CREATE_TABLE_t_script_bk: `
      CREATE TABLE ${tableNameMap.scriptBk} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 主键id，自增
      txt TEXT,                              -- json格式文本
      type TEXT,                             -- 类型
      no INTEGER,                            -- 序号
      modifiedTime TEXT                      -- 修改时间（包括添加时间）
    );
  `,
  CREATE_TABLE_t_file_rank: `
      CREATE TABLE ${tableNameMap.fileRank} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 主键id，自增
      filePath TEXT UNIQUE,                  -- 文件路径
      freq INTEGER                           -- 序号
    );
  `,
  CREATE_TABLE_t_global_shortcut: `
      CREATE TABLE ${tableNameMap.globalShortcut} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 主键id，自增
      keysCombination TEXT UNIQUE,           -- 按键组合
      href TEXT                              -- 对应路由href
    );
  `,

  },
  deletion: {
    DROP_TABLE_IF_EXISTS_t_script_bk: `
    DROP TABLE IF EXISTS ${tableNameMap.scriptBk};
    `
  }




 }



