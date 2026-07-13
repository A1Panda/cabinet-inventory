---
name: cabinet-inventory
description: Use when managing inventory items in cabinets/sections, searching stored items, or operating the cabinet management WebUI at localhost:3456. Covers the full CRUD stack (cabinets → sections → items) with a Node.js backend and Alpine.js frontend.
version: 1.0.0
author: A1_Panda
license: MIT
metadata:
  hermes:
    tags: [inventory, cabinet, storage, webui, nodejs, alpinejs]
---

# 柜子管家 (Cabinet Inventory Manager)

三层物料管理系统：柜子(Cabinet) → 分段(Section) → 物品(Item)。
纯 Node.js HTTP 后端 + Alpine.js 前端，零外部依赖。

## Quick Start

```bash
node scripts/server.js
# → http://localhost:3456
```

## Project Layout

```
柜子库存管理Skill/
├── SKILL.md              # This file (Hermes skill definition)
├── AGENTS.md             # Project guide for AI agents
├── scripts/
│   ├── server.js         # HTTP server (port 3456), pure Node.js
│   ├── store.js          # Data layer: CRUD + JSON persistence + auto-backup
│   ├── cli.js            # CLI tool for terminal management
│   └── find.js           # Full-text search + statistics
├── assets/webui/
│   ├── index.html        # Alpine.js SPA (single HTML file)
│   ├── app.js            # Frontend logic (Alpine.js data component)
│   └── style.css         # Design system (warm amber theme, responsive)
└── data/
    ├── storage.json      # Live data (auto-created on first run)
    └── backup/           # Auto-backups (50 max, created on each save)
```

## API Endpoints

All under `/api/`. Responses are JSON. Errors return `{error: "message"}`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/cabinets` | List all cabinets |
| POST | `/api/cabinets` | Create cabinet `{id, name, location_desc?}` |
| GET | `/api/cabinets/:id` | Get cabinet detail (with sections + items) |
| PUT | `/api/cabinets/:id` | Update cabinet `{name?, location_desc?}` |
| DELETE | `/api/cabinets/:id` | Delete cabinet (cascading) |
| POST | `/api/cabinets/:id/sections` | Add section `{sectionId, name?}` |
| DELETE | `/api/cabinets/:id/sections/:sid` | Delete section (must be empty) |
| POST | `/api/items` | Add item `{cabinetId, sectionId, name, qty?, tags?, aliases?, note?}` |
| PUT | `/api/items/:id` | Update item `{qty?, name?, note?, tags?, aliases?}` |
| DELETE | `/api/items/:id` | Remove item (body `{qty?}` for partial; omit for full delete) |
| GET | `/api/search?q=...` | Search items by name/tags/aliases/note |
| GET | `/api/stats` | Statistics: cabinet count, item count, total qty |
| GET | `/api/export` | Export as CSV (UTF-8 BOM) |
| POST | `/api/backup` | Manual backup trigger |

## CLI Usage

```bash
node scripts/cli.js cabinet list
node scripts/cli.js cabinet add A "仓库大铁柜" "进门左手边"
node scripts/cli.js cabinet show A
node scripts/cli.js section add A A1 "右1号分格"
node scripts/cli.js item add A A1 "螺丝刀" 10 --tags 工具,五金
node scripts/cli.js item take <itemId> 3       # 取走3个
node scripts/cli.js search 螺丝刀
node scripts/cli.js stats
node scripts/cli.js export > inventory.csv
```

## Frontend Architecture

- **Framework:** Alpine.js 3.14 (CDN, zero build step)
- **Icons:** Font Awesome 6.5 (CDN)
- **State:** Single `Alpine.data('app')` component in `app.js`
- **API client:** `const API = { get, post, put, del }` — fetch wrappers
- **Theme:** CSS custom properties for light/dark, persisted in localStorage
- **Responsive:** 3 breakpoints (900px / 640px / 380px)

Key Alpine state variables:
- `cabinets[]` — cabinet list
- `expandedCabinet` — currently expanded cabinet ID (or null)
- `cabinetDetail` — full cabinet object with sections+items
- `searchResults` — null (no search) / [] (no results) / [...] (results)
- `modal.{cabinet,section,item,stats}` — modal visibility toggles

## Data Model

```json
{
  "cabinets": {
    "A": {
      "id": "A",
      "name": "仓库大铁柜",
      "location_desc": "进门左手边",
      "sections": {
        "A1": {
          "id": "A1",
          "name": "右1号分格",
          "items": [
            {
              "id": "1710835200000",
              "name": "螺丝刀",
              "qty": 10,
              "tags": ["工具", "五金"],
              "aliases": ["改锥"],
              "note": "蓝色手柄",
              "createdAt": "2024-03-19T...",
              "updatedAt": "2024-03-19T..."
            }
          ]
        }
      }
    }
  }
}
```

## Common Pitfalls

1. **Server must be restarted after code changes** — Node.js caches `require()` modules. Kill the process and re-run `node scripts/server.js`.
2. **Section deletion requires empty section** — delete all items first, or the API returns an error. The UI prompts the user about this.
3. **Item ID collisions** — IDs are generated with `Date.now()`. Rapid consecutive additions in the same millisecond could collide (rare in practice).
4. **Backup proliferation** — every `saveData()` call triggers a backup. 50+ backups accumulate quickly. Clean `data/backup/` periodically.
5. **No authentication** — the server binds `0.0.0.0` by default. Only use on trusted networks.

## Verification Checklist

- [ ] `node scripts/server.js` starts without errors
- [ ] `http://localhost:3456` loads the WebUI
- [ ] Cabinets, sections, and items can be created/deleted via UI
- [ ] Search returns correct results
- [ ] Dark mode toggle works
- [ ] CSV export downloads a valid file
- [ ] Mobile layout (<640px) is usable
