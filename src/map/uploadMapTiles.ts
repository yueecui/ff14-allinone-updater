import { globSync } from 'glob';
import { HuijiWiki } from 'huijiwiki-api';
import { MWResponseBase } from 'huijiwiki-api/dist/HuijiWiki/typeMWApiResponse.js';
import { LowSync } from 'lowdb';
import { JSONFileSync } from 'lowdb/node';
import PQueue from 'p-queue';
import { MAP_BAST_PATH, TILE_MAP_PATH, WIKI_PASSWORD, WIKI_PREFIX, WIKI_USERNAME } from '../config.js';

// ------------------------------
// -- 参数配置
// ------------------------------

// 在里面的key将会重新上传，填写如a2d1_01（第一级目录名）
const REUPLOAD_TILE_KEYS: string[] = [];

// e3ec_00 多玛飞地

// ------------------------------
// -- 类型定义
// ------------------------------

interface TileInfo {
    path: string;
    pagename: string;
}

interface TileUploadInfo {
    n: string;
    d: string; // 上传时间
}

interface MWResponseImageInfo extends MWResponseBase {
    query: {
        pages: {
            [title: string]: {
                pageid?: number;
                ns: number;
                title: string;
                imagerepository: string;
                missing?: '';
                imageinfo?: {
                    timestamp: string;
                    user: string;
                }[];
            };
        };
    };
}

// ------------------------------
// -- 代码
// ------------------------------

async function main() {
    const db = new LowSync<{ tiles: TileUploadInfo[] }>(new JSONFileSync(`${MAP_BAST_PATH}/huijiUploadTiles.db.json`), {
        tiles: [],
    });
    db.read();

    const tileInfos = generateTileInfos();

    // 首次上传的话需要检查哪些已经有了
    if (db.data.tiles.length === 0) {
        const uploadedTiles = await checkUploadedTiles(tileInfos);
        db.data.tiles = uploadedTiles;
        db.write();
    }

    // 获取tileInfos和db中文件的差异
    const REUPLOAD_TILE_PAGENAMES: string[] = [];
    const diff = tileInfos.filter((tileInfo) => {
        const match = tileInfo.path.match(/tiles[\/\\](.*)[\/\\](.*)$/);
        if (match && REUPLOAD_TILE_KEYS.includes(match[1])) {
            REUPLOAD_TILE_PAGENAMES.push(tileInfo.pagename);
            return true;
        }
        return !db.data.tiles.some((uploadedTile) => uploadedTile.n === tileInfo.pagename);
    });

    if (diff.length === 0) {
        console.log('没有需要上传的文件');
        return;
    }

    // 开始上传
    const wiki = new HuijiWiki(WIKI_PREFIX);
    if (!(await wiki.apiLogin(WIKI_USERNAME, WIKI_PASSWORD))) {
        throw new Error('登录失败！');
    }

    const pq = new PQueue({
        concurrency: 5,
    });

    const newTiles: TileUploadInfo[] = [];

    const dbUpdate = () => {
        for (const tile of newTiles) {
            if (REUPLOAD_TILE_PAGENAMES.includes(tile.n)) {
                const index = db.data.tiles.findIndex((t) => t.n === tile.n);
                if (index !== -1) {
                    db.data.tiles[index] = tile;
                } else {
                    db.data.tiles.push(tile);
                }
            } else {
                db.data.tiles.push(tile);
            }
        }
        db.write();
    };
    const saveTimer = setInterval(() => {
        dbUpdate();
        newTiles.length = 0;
    }, 5000);

    for (let i = 0; i < diff.length; i++) {
        const tileInfo = diff[i];
        pq.add(() =>
            apiUplod(wiki, tileInfo).then((result) => {
                if (result) {
                    console.log(`[${i + 1}/${diff.length}] 上传完成：${tileInfo.pagename}`);
                }
                newTiles.push({
                    n: tileInfo.pagename,
                    d: new Date().toISOString(),
                });
            }),
        );
    }

    await pq.onIdle();
    dbUpdate();
    clearInterval(saveTimer);
}

// 根据本地的图片文件，生成所有tile的图片文件信息
function generateTileInfos() {
    const tilePaths = globSync(`${TILE_MAP_PATH}/**/*.{jpg,png}`);

    const tileInfos: TileInfo[] = tilePaths.map((tilePath) => {
        const tileMatch = tilePath.match(/tiles[\/\\](.*)$/);
        if (tileMatch) {
            const pagename = 'EorzeaMapTile_' + tileMatch[1].replace(/[\/\\]/g, '_');
            return {
                path: tilePath,
                pagename,
            };
        } else {
            console.log(`文件名不符合规范：${tilePath}`);
            return {
                path: tilePath,
                pagename: '',
            };
        }
    });

    return tileInfos;
}

// 在wiki检查哪些图片已上传
async function checkUploadedTiles(tileInfos: TileInfo[]) {
    const wiki = new HuijiWiki(WIKI_PREFIX);

    // 每50个文件一次请求
    const chunkSize = 50;
    const chunks = [];
    for (let i = 0; i < tileInfos.length; i += chunkSize) {
        chunks.push(tileInfos.slice(i, i + chunkSize));
    }

    const uploadedTiles: TileUploadInfo[] = [];

    console.log(`正在检查已上传的文件……每次请求${chunkSize}个文件，总共${chunks.length}次请求`);

    for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        const titles = chunk.map((tileInfo) => `文件:${tileInfo.pagename}`).join('|');
        const result = await apiQueryImageInfo(wiki, titles.split('|'));

        let count = 0;
        for (const page of Object.values(result.query.pages)) {
            if (page.missing === '') {
                continue;
            }
            count++;
            const imageinfo = page.imageinfo?.[0];
            if (imageinfo) {
                uploadedTiles.push({
                    n: page.title.replace(/^文件:/, '').replaceAll(' ', '_'),
                    d: imageinfo.timestamp,
                });
            }
        }

        sleep(500);
        console.log(`[${i + 1}/${chunks.length}]组 - ${chunk.length}个文件，${count}个已上传`);
    }

    return uploadedTiles;
}

// 请求检查数据
async function apiQueryImageInfo(wiki: HuijiWiki, titles: string[]) {
    try {
        const result = await wiki.request<MWResponseImageInfo>({
            action: 'query',
            prop: 'imageinfo',
            titles: titles.join('|'),
        });
        return result;
    } catch (e) {
        // 等待3秒后重试
        console.log('频率过快，等候3秒后重试');
        await sleep(3000);
        return apiQueryImageInfo(wiki, titles);
    }
}

// 上传指定文件
async function apiUplod(wiki: HuijiWiki, tileInfo: TileInfo) {
    try {
        const pagename = tileInfo.pagename;
        const result = await wiki.uploadImage(tileInfo.path, `文件:${pagename}`, {
            comment: '游戏地图数据 by [[用户:云泽宛风]] & [[用户:Yuee]]',
        });
        if (result.error) {
            if (result.error.code === 'fileexists-no-change') {
                console.log(`文件存在且无变化：${pagename}`);
                return false;
            }

            console.log(`上传失败：${pagename}，错误信息：${result.error.info}`);
            console.log(result);
            return false;
        } else {
            // console.log(`上传成功：${pagename}`);
            return true;
        }
    } catch (e) {
        console.log('频率过快，等候3秒后重试');
        await sleep(3000);
        return apiUplod(wiki, tileInfo);
    }
}

async function sleep(ms: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
