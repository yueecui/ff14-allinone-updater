# 最终幻想XIV中文维基工具相关本地更新脚本

## 环境
- node.js 20

## 地图更新流程

### 配置
- 复制 .env.simple 为 .env
- 修改4个配置项目

### 流程
- 先使用EorzeaMapExtractor.Cli解包地图
- 然后将解包后的地图放到source目录
- 执行「生成地图Tile」
  - 该步骤为增量生成，文件名已经存在的地图不会重新生成，如果旧地图更改，需要手工删除旧地图的文件目录，之后重新生成
- 执行「上传地图Tile」
  - 该步骤会根据huijiUploadTiles.db.json的记录增量更新，如果旧地图更改，需要手工删除记录文件里相关的文件，之后重新上传

