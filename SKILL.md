---
name: cabinet-inventory
description: Use when managing inventory items in cabinets/sections, searching stored items, or operating the cabinet management WebUI at localhost:3456. Supports conversational operations (add/take/search/move items) via CLI and full WebUI CRUD.
version: 1.0.0
author: 高晨翔
license: MIT
metadata:
  hermes:
    tags: [inventory, cabinet, storage, webui, nodejs, cli]
---

# 柜子管家 (Cabinet Inventory Manager)

三层物料管理系统：柜子(Cabinet) → 分段(Section) → 物品(Item)。纯 Node.js HTTP 后端 + Alpine.js WebUI，零外部依赖。

## 核心原则

**永远通过 CLI（`node scripts/cli.js`）操作数据，禁止直接读写 `data/storage.json`！**

## 快速开始

```bash
node scripts/server.js          # WebUI → http://localhost:3456
node scripts/cli.js cabinet list
node scripts/cli.js search 关键词
node scripts/cli.js stats
```

## 数据模型

| 层级 | 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| Cabinet | id | string | 是 | 大写字母，如 A, B, C |
| Cabinet | name | string | 是 | 柜子名称 |
| Cabinet | location_desc | string | 否 | 位置描述 |
| Cabinet | sections | object | 是 | 分段映射 |
| Section | id | string | 是 | 柜号+数字，如 A1, B2 |
| Section | name | string | 否 | 分段描述 |
| Item | id | string | 是 | 时间戳生成 |
| Item | name | string | 是 | 物品名称 |
| Item | qty | number | 是 | 数量 |
| Item | tags | string[] | 否 | 搜索标签 |
| Item | aliases | string[] | 否 | 别名/俗称 |
| Item | note | string | 否 | 备注 |

## 对话操作：AI 自动分析规则

**存入物品时，AI 必须自动分析名称，提取标签和别名，无需用户手动指定。**

### 标签（tags）提取规则
从名称中拆出类别、品牌、规格、型号、单位：
- "华为66W充电器" → `充电器, 华为, 66W, Type-C`
- "M6不锈钢螺丝" → `螺丝, M6, 不锈钢`
- "十字螺丝刀" → `螺丝刀, 工具, 手动`
- "电容100μF 16V" → `电容, 电子, 100μF, 16V`

### 别名（aliases）提取规则
提供常见简称、俗称、同义词：
- "华为66W充电器" → `华为充电头, 快充头`
- "十字螺丝刀" → `螺丝批, 改锥, 十字批`
- "绝缘胶带" → `电工胶布, 黑胶布`

### 备注（note）
颜色、规格等补充信息放入 `--note`。

**示例：** 用户说「放个红色海绵砂纸100慕在A1」
→ AI 分析：名称=红色海绵砂纸100慕，标签=砂纸,海绵,100慕,耗材，别名=海绵砂纸,红色砂纸
→ `node scripts/cli.js item add A A1 "红色海绵砂纸100慕" 1 --tags 砂纸,海绵,100慕,耗材 --aliases 海绵砂纸,红色砂纸`

## 对话操作范例

### 存入物品
> 用户：「把华为充电器放A1了」
→ `node scripts/cli.js item add A A1 "华为充电器" 1 --tags 充电器,华为 --aliases 华为充电头`
> 同名物品自动合并数量；`item add A A1 "华为充电器" 5` 则数量+5

### 查找物品
> 用户：「充电器在哪」
→ `node scripts/cli.js search 充电器`
> 匹配 name、tags、aliases、note（不区分大小写）

### 查看柜子
> 用户：「A里有什么」
→ `node scripts/cli.js cabinet show A`

### 列出所有柜子
> 用户：「有哪些柜子」
→ `node scripts/cli.js cabinet list`

### 取走物品（减数量）
> 用户：「A1的充电器拿走了」
→ 先 `node scripts/cli.js search 充电器` 获取 itemId
→ `node scripts/cli.js item take <itemId>`（全取）或 `item take <itemId> 2`（取2个）

### 删除物品
> 用户：「把A1的充电器删掉」
→ 先 `search` 获取 itemId → `node scripts/cli.js item del <itemId>`

### 移库
> 用户：「把A1的充电器移到B1」
→ `node scripts/cli.js cabinet show A` 查看 itemId
→ `node scripts/cli.js item add B B1 "充电器" <数量> --tags ...`
→ `node scripts/cli.js item take <itemId> <数量>`

### 盘点/统计
> 用户：「看看整体情况」
→ `node scripts/cli.js stats`

### 添加柜子/分段
> 用户：「加个新柜子C」
→ `node scripts/cli.js cabinet add C "新柜子" "放在XX位置"`
> 用户：「给A加个分段A3」
→ `node scripts/cli.js section add A A3 "A3分格"`

### 导出/备份
> 用户：「导出清单」→ `node scripts/cli.js export`
> 用户：「手动备份」→ `node scripts/cli.js backup`

## 操作流程

每次用户请求：
1. 识别意图，选择对应 CLI 命令
2. 如需 itemId（take/del），先 `node scripts/cli.js search <关键词>` 获取
3. 存入物品时自动分析 tags/aliases
4. 执行命令，将输出摘要展示给用户

## WebUI

```bash
node scripts/server.js   # → http://localhost:3456
```

功能：柜子卡片总览、展开分段、全局搜索、增删改查、取走/存入、统计面板、CSV 导出、暗色模式、移动端响应式。

## API 端点（用于程序化调用时参考）

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cabinets` | 列出柜子 |
| POST | `/api/cabinets` | 添加柜子 `{id, name, location_desc?}` |
| GET | `/api/cabinets/:id` | 柜子详情（含分段+物品） |
| PUT | `/api/cabinets/:id` | 更新柜子 |
| DELETE | `/api/cabinets/:id` | 删除柜子 |
| POST | `/api/cabinets/:id/sections` | 添加分段 `{sectionId, name?}` |
| DELETE | `/api/cabinets/:id/sections/:sid` | 删除分段（需为空） |
| POST | `/api/items` | 存入物品 `{cabinetId, sectionId, name, qty?, tags?, aliases?, note?}` |
| PUT | `/api/items/:id` | 修改物品 `{qty?, name?, ...}` |
| DELETE | `/api/items/:id` | 取走/删除 `{qty?}` |
| GET | `/api/search?q=...` | 搜索 |
| GET | `/api/stats` | 统计 |
| GET | `/api/export` | 导出 CSV |
| POST | `/api/backup` | 手动备份 |

## 项目布局

```
├── SKILL.md / AGENTS.md    # 项目文档
├── scripts/                # 后端（Node.js）
│   ├── server.js           # HTTP 服务器
│   ├── store.js            # 数据层 + 自动备份
│   ├── cli.js              # 命令行工具
│   └── find.js             # 搜索 + 统计
├── assets/webui/           # 前端（Alpine.js）
│   ├── index.html / app.js / style.css
├── data/                   # 运行时数据
│   ├── storage.json        # 主数据
│   └── backup/             # 自动备份（最多 50 个）
└── .trae/                  # Trae IDE skill 定义（已适配为通用格式）
```

## 常见陷阱

1. Server 修改后需重启（`require()` 缓存模块）
2. 删除分段需先清空物品
3. 备份文件会堆积，定期清理 `data/backup/`
4. 无鉴权，仅在可信网络使用
5. Item ID 用 `Date.now()`，极快连续添加可能碰撞
