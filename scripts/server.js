/**
 * 柜子管家 - Web 服务器
 * 纯 Node.js HTTP，零依赖
 * 层级：Cabinet → Section → Item
 * 端口: 3456
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const store = require('./store');
const finder = require('./find');

const PORT = process.env.PORT || 3456;
const WEBUI_DIR = path.join(__dirname, '..', 'assets', 'webui');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon'
};

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

function sendJSON(res, data, status = 200) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data));
}

function sendError(res, message, status = 400) {
  sendJSON(res, { error: message }, status);
}

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  const mime = MIME[ext] || 'application/octet-stream';
  if (!fs.existsSync(filePath)) { res.writeHead(404); res.end('Not Found'); return; }
  res.writeHead(200, { 'Content-Type': mime });
  fs.createReadStream(filePath).pipe(res);
}

function parseURL(req) {
  return new URL(req.url, `http://${req.headers.host || 'localhost'}`);
}

function parsePath(pathname) {
  const parts = pathname.replace(/^\/api\//, '').split('/').filter(Boolean);
  const params = {};
  if (parts[0] === 'cabinets') {
    if (parts[1]) params.cabinetId = parts[1];
    if (parts[2] === 'sections' && parts[3]) params.sectionId = parts[3];
  }
  if (parts[0] === 'items' && parts[1]) params.itemId = parts[1];
  if (parts[0] === 'search') params.action = 'search';
  if (parts[0] === 'stats') params.action = 'stats';
  if (parts[0] === 'export') params.action = 'export';
  if (parts[0] === 'backup') params.action = 'backup';
  return params;
}

async function handleAPI(req, res) {
  const url = parseURL(req);
  const method = req.method;
  const pathname = url.pathname;
  const query = Object.fromEntries(url.searchParams);
  const p = parsePath(pathname);

  try {
    // ===== 柜子 =====
    if (pathname === '/api/cabinets' && method === 'GET') return sendJSON(res, store.listCabinets());
    if (pathname === '/api/cabinets' && method === 'POST') {
      const body = await parseBody(req);
      if (!body.id || !body.name) return sendError(res, '缺少 id 或 name');
      const result = store.addCabinet(body.id, body.name, body.location_desc || '');
      return sendJSON(res, result, result.error ? 400 : 201);
    }
    if (p.cabinetId && !p.sectionId) {
      if (method === 'GET') { const cab = store.getCabinet(p.cabinetId); if (!cab) return sendError(res, '柜子不存在', 404); return sendJSON(res, cab); }
      if (method === 'PUT') { const body = await parseBody(req); const r = store.updateCabinet(p.cabinetId, body); return sendJSON(res, r, r.error ? 400 : 200); }
      if (method === 'DELETE') { const r = store.deleteCabinet(p.cabinetId); return sendJSON(res, r, r.error ? 400 : 200); }
    }

    // ===== 分段 =====
    if (p.cabinetId && pathname.endsWith('/sections') && !p.sectionId && method === 'POST') {
      const body = await parseBody(req);
      if (!body.sectionId) return sendError(res, '缺少 sectionId');
      const r = store.addSection(p.cabinetId, body.sectionId, body.name || '');
      return sendJSON(res, r, r.error ? 400 : 201);
    }
    if (p.cabinetId && p.sectionId) {
      if (method === 'PUT') { const body = await parseBody(req); const r = store.updateSection(p.cabinetId, p.sectionId, body); return sendJSON(res, r, r.error ? 400 : 200); }
      if (method === 'DELETE') { const r = store.deleteSection(p.cabinetId, p.sectionId); return sendJSON(res, r, r.error ? 400 : 200); }
    }

    // ===== 物品 =====
    if (pathname === '/api/items' && method === 'POST') {
      const body = await parseBody(req);
      if (!body.cabinetId || !body.sectionId || !body.name) return sendError(res, '缺少 cabinetId, sectionId 或 name');
      const r = store.addItem(body.cabinetId, body.sectionId, {
        name: body.name, tags: body.tags || [], aliases: body.aliases || [],
        qty: body.qty || 1, note: body.note || ''
      });
      return sendJSON(res, r, r.error ? 400 : 201);
    }
    if (p.itemId) {
      if (method === 'PUT') { const body = await parseBody(req); const r = store.updateItem(p.itemId, body); return sendJSON(res, r, r.error ? 400 : 200); }
      if (method === 'DELETE') { const body = await parseBody(req); const r = store.removeItem(p.itemId, body.qty); return sendJSON(res, r, r.error ? 400 : 200); }
    }

    // ===== 搜索 / 统计 / 导出 / 备份 =====
    if (p.action === 'search') { const q = query.q || ''; if (!q) return sendJSON(res, []); return sendJSON(res, finder.search(q)); }
    if (p.action === 'stats') return sendJSON(res, finder.getStats());
    if (p.action === 'export') {
      const csv = store.exportCSV();
      res.writeHead(200, { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename=inventory.csv' });
      res.end('\uFEFF' + csv);
      return;
    }
    if (p.action === 'backup' && method === 'POST') { store.backupData(); return sendJSON(res, { success: true, message: '备份完成' }); }

    sendError(res, 'Not Found', 404);
  } catch (err) { console.error('API Error:', err); sendError(res, '服务器内部错误', 500); }
}

const server = http.createServer((req, res) => {
  const url = parseURL(req);
  if (url.pathname.startsWith('/api/')) return handleAPI(req, res);
  let filePath = url.pathname === '/' ? '/index.html' : url.pathname;
  filePath = path.join(WEBUI_DIR, filePath);
  if (!filePath.startsWith(WEBUI_DIR)) { res.writeHead(403); res.end('Forbidden'); return; }
  serveStatic(res, filePath);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  📦 柜子管家 WebUI 已启动`);
  console.log(`  ┌─────────────────────────────────────┐`);
  console.log(`  │  本地访问:  http://localhost:${PORT}      │`);
  console.log(`  │  局域网访问:  用主机 IP 加端口 :${PORT}   │`);
  console.log(`  │  按 Ctrl+C 停止服务                  │`);
  console.log(`  └─────────────────────────────────────┘\n`);
});
