import { HuijiWiki } from 'huijiwiki-api';
import { HuijiwikiSqliteCache } from 'huijiwiki-api-sqlite-cache';
import { SQLITE_PATH, WIKI_AUTH_TOKEN, WIKI_PASSWORD, WIKI_PREFIX, WIKI_USERNAME } from '../config.js';

export class HuijiWikiConnector {
    private static instance: HuijiWikiConnector;
    private wiki: HuijiWiki;

    private constructor() {
        const sqliteCache = new HuijiwikiSqliteCache(WIKI_PREFIX, SQLITE_PATH);
        this.wiki = new HuijiWiki(WIKI_PREFIX, WIKI_AUTH_TOKEN, { cache: sqliteCache });
    }

    private async login() {
        if (!(await this.wiki.apiLogin(WIKI_USERNAME, WIKI_PASSWORD))) {
            throw new Error('登录失败！');
        }
    }

    public static async getInstance() {
        if (!HuijiWikiConnector.instance) {
            HuijiWikiConnector.instance = new HuijiWikiConnector();
            await HuijiWikiConnector.instance.login();
        }
        return HuijiWikiConnector.instance;
    }

    public async editPage(wikiPageTitle: string, wikiPageContent: string) {
        if (!(await this.wiki.compareContent(wikiPageTitle, wikiPageContent))) {
            const res = await this.wiki.editPage(wikiPageTitle, wikiPageContent, { summary: '由机器人自动更新' });
            if (res.error) {
                console.log(`更新失败：${wikiPageTitle}，错误信息：${res.error.info}`);
            } else if (res.edit.result === 'Success') {
                if (res.edit.nochange === '') {
                    console.log(`[[${wikiPageTitle}]]无变化`);
                } else {
                    console.log(`[[${wikiPageTitle}]]已上传`);
                }
                // 只在本地缓存生成的内容，不包括线上人工部分，方便下次比较
                this.wiki.localCache.set(wikiPageTitle, wikiPageContent);
            } else {
                console.log(`[[${wikiPageTitle}]]上传失败：${res.edit.result}`);
            }
        }
    }
}
