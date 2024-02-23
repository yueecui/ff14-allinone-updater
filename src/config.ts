import dotenv from 'dotenv';

dotenv.config();

// 假更新，打开时所有会关闭src/updater/util.ts中的更新功能
export const DUMMY_UPDATE = false;

export const WORKSPACE_PATH = process.env.WORKSPACE_PATH!;
export const SQLITE_PATH = `${WORKSPACE_PATH}\\wikitext.sqlite`;

export const TO_BE_UPLOAD_PATH = `${WORKSPACE_PATH}\\upload`; // 等待上传的文件路径

// 地图相关目录配置
export const MAP_BAST_PATH = process.env.MAP_BASE_PATH!;
export const SOURCE_MAP_PATH = `${MAP_BAST_PATH}\\source`;
export const TILE_MAP_PATH = `${MAP_BAST_PATH}\\tiles`;

// WIKI 配置
export const WIKI_PREFIX = 'ff14';
export const WIKI_USERNAME = process.env.WIKI_USERNAME!;
export const WIKI_PASSWORD = process.env.WIKI_PASSWORD!;

/** 是否输出无内容的LEVEL */
export const LEVEL_DATA_DEBUG = true;

/** COS配置 */
export const COS_SECRET_ID = process.env.COS_SECRET_ID!;
export const COS_SECRET_KEY = process.env.COS_SECRET_KEY!;
