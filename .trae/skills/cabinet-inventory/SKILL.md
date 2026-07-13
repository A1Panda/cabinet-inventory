---
name: "cabinet-inventory"
description: "Manages cabinet/locker inventory with hierarchical shelf structure, keyword search, and Web UI. Stores data as local JSON with auto-backup. Invoke when user needs to manage cabinet storage, search items, or perform inventory operations."
---

# 柜子管家 (Cabinet Inventory Manager)

本 Skill 用于管理柜子库存，支持层级柜子结构、关键词搜索、Web UI 可视化操作。数据以 JSON 文件存储在本地，每次修改自动备份。

## 数据存储

- **主文件**：`data/storage.json`
- **备份目录**：`data/backup/`（每次写操作前自动备份为 `storage_YYYYMMDD_HHmmss.json`）
- 首次使用时自动创建空数据结构

## 数据模型

### 柜子结构：柜子 → 分段 → 物品

- **柜子**：如 A（仓库大铁柜A）、B（车间工具柜）、C
- **分段**：每个柜子的分格，如 A1、A2、A3 是柜子 A 的分段，分段即直接存放物品

```json
{
  "cabinets": {
    "A": {
      "id": "A",
      "name": "仓库大铁柜A",
      "location_desc": "仓库进门左手边",
      "sections": {
        "A1": {
          "id": "A1",
          "name": "A1 右1号分格",
          "items": [
            {
              "id": "1710856800000",
              "name": "华为66W充电器",
              "tags": ["充电器", "华为", "66W", "Type-C"],
              "aliases": ["华为充电头"],
              "qty": 2,
              "note": "白色，配套线也在"
            }
          ]
        }
      }
    }
  }
}
```

### 字段说明

| 层级 | 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|------|
| Cabinet | id | string | 是 | 唯一标识，如 A, B, C |
| Cabinet | name | string | 是 | 柜子名称 |
| Cabinet | location_desc | string | 否 | 位置描述 |
| Cabinet | sections | object | 是 | 分段映射，key 为分段ID（如 A1, B3） |
| Section | id | string | 是 | 分段标识，如 A1, B2 |
| Section | name | string | 否 | 分段描述名称 |
| Section | items | array | 是 | 物品列表 |
| Item | id | string | 是 | 时间戳生成，唯一标识 |
| Item | name | string | 是 | 物品名称 |
| Item | tags | string[] | 否 | 搜索标签 |
| Item | aliases | string[] | 否 | 别名，用于模糊匹配 |
| Item | qty | number | 是 | 数量 |
| Item | note | string | 否 | 备注 |

### 柜号/分段规则

- **柜子**：用大写字母标识，如 `A`、`B`、`C`（对应不同的物理柜子）
- **分段**：`柜号 + 数字`，如 `A1`、`A2`、`A3` 是柜子 A 的分段
- 例如：柜子 A 有分段 A1、A2、A3；柜子 B 有分段 B1、B2

## 对话操作（CLI 模式）

**重要：AI 对话中操作库存统一使用 CLI 工具，禁止直接 Read/Write storage.json！**

CLI 工具路径：`node scripts/cli.js`

### 物品标签与别名（AI 自动分析）

**存入物品时，AI 必须自动分析物品名称，提取合适的标签和别名，无需用户手动指定。**

分析规则：
1. **标签（tags）**：从名称中拆出类别、品牌、规格、型号、单位等关键词。例如：
   - "华为66W充电器" → `充电器, 华为, 66W, Type-C`
   - "M6不锈钢螺丝" → `螺丝, M6, 不锈钢`
   - "3M黑色绝缘胶带" → `胶带, 电工, 3M, 绝缘, 耗材`
   - "十字螺丝刀" → `螺丝刀, 工具, 手动`
   - "电容100μF 16V" → `电容, 电子, 100μF, 16V`
2. **别名（aliases）**：提供常见简称、俗称、同义词。例如：
   - "华为66W充电器" → `华为充电头, 快充头`
   - "十字螺丝刀" → `螺丝批, 改锥, 十字批`
   - "绝缘胶带" → `电工胶布, 黑胶布`
   - "活动扳手" → `扳手, 活扳`
3. 如果物品描述中包含颜色、规格等备注信息，放入 `--note` 参数。

**示例：**
用户说「放个红色海绵砂纸100慕在A1」
→ AI 分析：名称=红色海绵砂纸100慕，标签=砂纸,海绵,100慕,耗材，别名=海绵砂纸,红色砂纸
→ `node scripts/cli.js item add A A1 红色海绵砂纸100慕 1 --tags 砂纸,海绵,100慕,耗材 --aliases 海绵砂纸,红色砂纸`

### 存入物品
**用户**：「把华为充电器放A1了」
→ `node scripts/cli.js item add A A1 华为充电器 1 --tags 充电器,华为 --aliases 华为充电头`

### 查找物品
**用户**：「充电器在哪」
→ `node scripts/cli.js search 充电器`

### 查看柜子
**用户**：「A里有什么」
→ `node scripts/cli.js cabinet show A`

### 列出所有柜子
**用户**：「有哪些柜子」
→ `node scripts/cli.js cabinet list`

### 拿走物品（减数量）
**用户**：「A1的充电器拿走了」
→ `node scripts/cli.js item take <itemId>`
需要先 `search` 获取 itemId，再执行 take

### 删除物品
**用户**：「把A1的充电器删掉」
→ `node scripts/cli.js item del <itemId>`
需要先 `search` 获取 itemId，再执行 del

### 增加物品（同名自动合并）
**用户**：「A1再加5个充电器」
→ `node scripts/cli.js item add A A1 华为充电器 5`

### 移库
**用户**：「把A1的充电器移到B1」
先用 `cabinet show A` 查看 itemId，再用 `item add B B1 充电器 <数量>`，再用 `item take <itemId> <数量>` 从 A1 取走

### 盘点/统计
**用户**：「看看整体情况」
→ `node scripts/cli.js stats`

### 导出
**用户**：「导出清单」
→ `node scripts/cli.js export`

### 备份
**用户**：「手动备份」
→ `node scripts/cli.js backup`

### 添加柜子
**用户**：「加个新柜子C」
→ `node scripts/cli.js cabinet add C 新柜子 放在XX位置`

### 添加分段
**用户**：「给A加个分段A3」
→ `node scripts/cli.js section add A A3 A3分格`

### 删除分段
**用户**：「删掉A的A3」
→ `node scripts/cli.js section delete A A3`

## WebUI

### 启动方式
```bash
node scripts/server.js
```
访问 `http://localhost:3456`（局域网其他设备用主机 IP 访问）

### WebUI 功能
- 柜子卡片总览，点击展开分段
- 全局搜索框，高亮匹配结果
- 添加柜子 / 添加分段 / 存入物品
- 取出物品（减数量或删除）
- 统计面板
- 导出 CSV
- 移动端响应式

### API 端点
| 方法 | 路径 | 说明 |
|------|------|------|
| GET | /api/cabinets | 列出所有柜子 |
| GET | /api/cabinets/:id | 获取单个柜子详情 |
| POST | /api/cabinets | 添加柜子 |
| PUT | /api/cabinets/:id | 编辑柜子信息 |
| DELETE | /api/cabinets/:id | 删除柜子 |
| POST | /api/items | 添加物品到指定柜子分段 |
| PUT | /api/items/:itemId | 修改物品（名称/数量/标签等） |
| DELETE | /api/items/:itemId | 删除物品 |
| GET | /api/search?q=keyword | 搜索物品 |
| GET | /api/stats | 统计概览 |
| GET | /api/export | 导出 CSV |
| POST | /api/backup | 手动备份 |

## 安全与备份

- **自动备份**：每次 `saveData()` 写操作前，自动备份到 `data/backup/`
- **备份保留**：最近 50 个备份，超出自动删除旧备份
- **无登录**：局域网内直接访问，无需鉴权

## 操作流程（对话模式）

每次操作用户请求时：
1. 识别用户意图，选择对应的 CLI 命令
2. 如需 itemId（如 take/del），先 `node scripts/cli.js search <关键词>` 获取
3. 执行 `node scripts/cli.js <命令>` 完成操作
4. 将 CLI 输出摘要展示给用户

**核心原则：永远通过 CLI 操作数据，不要直接读写 storage.json。**

## 注意事项

- 所有日期时间使用 ISO 8601 格式
- item.id 使用时间戳字符串确保唯一
- 操作前验证柜子和分段存在，不存在则自动创建
- 搜索匹配：name 包含、tags 包含、aliases 包含（不区分大小写）
- 备份文件数量上限 50 个，超出自动清理
