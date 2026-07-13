# 柜子管家 — Project Guide for AI Agents

This is a cabinet inventory management system with a three-tier data model:
**Cabinet → Section → Item**.

## How to Run

```bash
node scripts/server.js     # Start on http://localhost:3456
```

The server is pure Node.js with zero dependencies. No `npm install` needed.

## How to Modify

### Frontend (WebUI)
- **HTML:** `assets/webui/index.html` — Alpine.js templates. All state lives in
  the `app` Alpine component defined in app.js. Alpine bindings use `x-`
  directives: `x-model`, `x-show`, `x-text`, `@click`, `x-transition`.
- **CSS:** `assets/webui/style.css` — CSS custom properties in `:root`
  (light) and `[data-theme="dark"]` (dark). Warm amber accent (`--accent`).
- **JS:** `assets/webui/app.js` — Alpine.data('app', ...). API calls via
  `API.get/post/put/del()`. State variables: cabinets, expandedCabinet,
  searchResults, modal.*, toast.

### Backend
- **Server:** `scripts/server.js` — HTTP routing. Add new routes in
  `handleAPI()`. No middleware, no Express.
- **Store:** `scripts/store.js` — All CRUD + JSON persistence. Data lives
  in `data/storage.json`. `saveData()` auto-backups to `data/backup/`.
- **Search:** `scripts/find.js` — Full-text search + stats.

### Key Conventions
- API errors return `{error: "message"}` with appropriate HTTP status.
- Item IDs are `Date.now().toString()` timestamps.
- Section IDs are user-provided strings like "A1", "B2".
- Frontend uses Alpine.js 3.14 and Font Awesome 6.5 from CDN.
- No build step — edit files, refresh browser.

## Important: Do NOT
- Do NOT install npm packages — the project is intentionally zero-dependency.
- Do NOT change the data model without updating both store.js and the frontend.
- Do NOT modify Alpine.js bindings without understanding x-data flow.
- Do NOT delete `data/storage.json` unless you want to reset all data.

## File Change Rules

When modifying the frontend:
1. If adding a new button, add both HTML (in index.html) and logic (in app.js).
2. If adding a new modal, follow the existing modal pattern exactly.
3. Test both light and dark mode.

When modifying the backend:
1. Add the route in `handleAPI()` in server.js.
2. Add the store function in store.js if needed.
3. Restart the server after changes (Node.js caches modules).
