import fs from 'fs';
import { HuijiWiki } from 'huijiwiki-api';
import { HuijiwikiSqliteCache } from 'huijiwiki-api-sqlite-cache';
import { default as PQueue } from 'p-queue';
import path from 'path';
import { SQLITE_PATH, TO_BE_UPLOAD_PATH, WIKI_PASSWORD, WIKI_PREFIX, WIKI_USERNAME } from '../config';

async function upload(wiki: HuijiWiki, fileName: string) {
    const filePath = `${TO_BE_UPLOAD_PATH}\\${fileName}`;
    const result = await wiki.uploadImage(filePath, fileName);
    if (result.error) {
        if (result.error.code === 'fileexists-no-change') {
            console.log(`文件存在且无变化：${fileName}`);
            // 移除文件
            fs.unlinkSync(filePath);
            return;
        }

        console.log(`上传失败：${fileName}，错误信息：${result.error.info}`);
        console.log(result);
    } else {
        console.log(`上传成功：${fileName}`);
        // 移除文件
        fs.unlinkSync(filePath);
    }
}

export const uploadFile = async () => {
    const sqliteCache = new HuijiwikiSqliteCache(WIKI_PREFIX, SQLITE_PATH);
    const wiki = new HuijiWiki(WIKI_PREFIX, { cache: sqliteCache });
    if (!(await wiki.apiLogin(WIKI_USERNAME, WIKI_PASSWORD))) {
        throw new Error('登录失败！');
    }
    const pq = new PQueue({
        concurrency: 10,
    });

    const dir = fs.readdirSync(TO_BE_UPLOAD_PATH);

    for (const fileName of dir) {
        // 如果是文件夹，跳过
        if (fs.statSync(path.join(TO_BE_UPLOAD_PATH, fileName)).isDirectory()) {
            continue;
        }

        pq.add(() => upload(wiki, fileName));
    }

    await pq.onIdle();
};

// 如果直接运行
if (require.main === module) {
    uploadFile();
}
