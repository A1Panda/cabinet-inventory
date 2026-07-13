# 柜子管家

三层物料管理系统，帮你在柜子→分段→物品的层级里管理库存。纯 Node.js + Alpine.js，零依赖，开箱即用。

![](assets/screenshot.png)

## 快速开始

```bash
node scripts/server.js
```

打开 http://localhost:3456

## 功能

- **WebUI** — 柜子卡片总览，点击展开分段与物品，全局搜索，暗色模式，移动端适配
- **CLI** — 终端直接管理，适合脚本和 AI 助手调用
- **存入/取走** — 支持增减数量，同名物品自动合并
- **标签与别名** — 搜索时匹配名称、标签、别名、备注
- **CSV 导出** — 一键导出完整清单
- **自动备份** — 每次修改前自动备份到 `data/backup/`（保留最近 50 个）
- **零依赖** — 不需要 `npm install`，Node.js 18+ 即可

## CLI 用法

```bash
# 柜子
node scripts/cli.js cabinet list
node scripts/cli.js cabinet add A "仓库大铁柜" "进门左手边"
node scripts/cli.js cabinet show A

# 分段
node scripts/cli.js section add A A1 "右1号分格"

# 物品
node scripts/cli.js item add A A1 "螺丝刀" 10 --tags 工具,五金 --aliases 改锥
node scripts/cli.js item take <itemId> 3
node scripts/cli.js search 螺丝刀

# 工具
node scripts/cli.js stats
node scripts/cli.js export > inventory.csv
node scripts/cli.js backup
```

## 项目结构

```
├── scripts/
│   ├── server.js    HTTP 服务器（端口 3456）
│   ├── store.js     数据层 CRUD + JSON 持久化 + 自动备份
│   ├── cli.js       命令行工具
│   └── find.js      全文搜索 + 统计
├── assets/webui/
│   ├── index.html   Alpine.js SPA
│   ├── app.js       前端逻辑
│   └── style.css    设计系统（暖橙色主题）
└── data/
    ├── storage.json 主数据文件
    └── backup/      自动备份
```

## API

| Method | Path | 说明 |
|--------|------|------|
| GET | `/api/cabinets` | 列出柜子 |
| POST | `/api/cabinets` | 添加柜子 |
| GET | `/api/cabinets/:id` | 柜子详情 |
| PUT | `/api/cabinets/:id` | 更新柜子 |
| DELETE | `/api/cabinets/:id` | 删除柜子 |
| POST | `/api/cabinets/:id/sections` | 添加分段 |
| DELETE | `/api/cabinets/:id/sections/:sid` | 删除分段 |
| POST | `/api/items` | 存入物品 |
| PUT | `/api/items/:id` | 修改物品 |
| DELETE | `/api/items/:id` | 取走/删除物品 |
| GET | `/api/search?q=...` | 搜索 |
| GET | `/api/stats` | 统计 |
| GET | `/api/export` | 导出 CSV |
| POST | `/api/backup` | 手动备份 |

## License

MIT
