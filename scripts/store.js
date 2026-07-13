/**
 * 柜子管家 - 数据存储模块
 * 层级：柜子(Cabinet) → 分段(Section) → 物品(Item)
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'storage.json');
const BACKUP_DIR = path.join(__dirname, '..', 'data', 'backup');
const MAX_BACKUPS = 50;

function ensureDirs() {
  [path.dirname(DATA_FILE), BACKUP_DIR].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function loadData() {
  ensureDirs();
  if (!fs.existsSync(DATA_FILE)) {
    const empty = { cabinets: {} };
    fs.writeFileSync(DATA_FILE, JSON.stringify(empty, null, 2), 'utf8');
    return empty;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
}

function backupData() {
  ensureDirs();
  if (!fs.existsSync(DATA_FILE)) return;
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const backupFile = path.join(BACKUP_DIR, `storage_${timestamp}.json`);
  fs.copyFileSync(DATA_FILE, backupFile);
  const backups = fs.readdirSync(BACKUP_DIR)
    .filter(f => f.startsWith('storage_') && f.endsWith('.json')).sort();
  while (backups.length > MAX_BACKUPS) {
    fs.unlinkSync(path.join(BACKUP_DIR, backups.shift()));
  }
}

function saveData(data) {
  ensureDirs();
  backupData();
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
}

function nowISO() { return new Date().toISOString(); }

function countSectionItems(section) {
  return (section.items || []).reduce((sum, i) => sum + (i.qty || 0), 0);
}

// ========== 柜子 ==========

function listCabinets() {
  const data = loadData();
  return Object.entries(data.cabinets).map(([id, cab]) => ({
    id, name: cab.name, location_desc: cab.location_desc || '',
    sectionCount: Object.keys(cab.sections || {}).length,
    createdAt: cab.createdAt, updatedAt: cab.updatedAt
  }));
}

function getCabinet(cabinetId) {
  const data = loadData();
  const cab = data.cabinets[cabinetId];
  if (!cab) return null;
  return { id: cabinetId, ...cab };
}

function addCabinet(id, name, location_desc = '') {
  const data = loadData();
  if (data.cabinets[id]) return { error: `柜子 ${id} 已存在` };
  data.cabinets[id] = { id, name, location_desc, sections: {}, createdAt: nowISO(), updatedAt: nowISO() };
  saveData(data);
  return { success: true, cabinet: data.cabinets[id] };
}

function updateCabinet(cabinetId, updates) {
  const data = loadData();
  const cab = data.cabinets[cabinetId];
  if (!cab) return { error: `柜子 ${cabinetId} 不存在` };
  if (updates.name !== undefined) cab.name = updates.name;
  if (updates.location_desc !== undefined) cab.location_desc = updates.location_desc;
  cab.updatedAt = nowISO();
  saveData(data);
  return { success: true, cabinet: { id: cabinetId, ...cab } };
}

function deleteCabinet(cabinetId) {
  const data = loadData();
  if (!data.cabinets[cabinetId]) return { error: `柜子 ${cabinetId} 不存在` };
  delete data.cabinets[cabinetId];
  saveData(data);
  return { success: true };
}

// ========== 分段 ==========

function addSection(cabinetId, sectionId, name = '') {
  const data = loadData();
  const cab = data.cabinets[cabinetId];
  if (!cab) return { error: `柜子 ${cabinetId} 不存在` };
  if (!cab.sections) cab.sections = {};
  if (cab.sections[sectionId]) return { error: `分段 ${sectionId} 已存在` };
  cab.sections[sectionId] = { id: sectionId, name: name || sectionId, items: [], createdAt: nowISO(), updatedAt: nowISO() };
  cab.updatedAt = nowISO();
  saveData(data);
  return { success: true, section: cab.sections[sectionId] };
}

function updateSection(cabinetId, sectionId, updates) {
  const data = loadData();
  const cab = data.cabinets[cabinetId];
  if (!cab) return { error: `柜子 ${cabinetId} 不存在` };
  const sec = cab.sections && cab.sections[sectionId];
  if (!sec) return { error: `分段 ${sectionId} 不存在` };
  if (updates.name !== undefined) sec.name = updates.name;
  sec.updatedAt = nowISO(); cab.updatedAt = nowISO();
  saveData(data);
  return { success: true };
}

function deleteSection(cabinetId, sectionId) {
  const data = loadData();
  const cab = data.cabinets[cabinetId];
  if (!cab) return { error: `柜子 ${cabinetId} 不存在` };
  if (!cab.sections || !cab.sections[sectionId]) return { error: `分段 ${sectionId} 不存在` };
  if (cab.sections[sectionId].items && cab.sections[sectionId].items.length > 0) {
    return { error: '分段不为空，请先清空物品' };
  }
  delete cab.sections[sectionId];
  cab.updatedAt = nowISO();
  saveData(data);
  return { success: true };
}

// ========== 物品 ==========

function addItem(cabinetId, sectionId, itemData) {
  const data = loadData();
  const cab = data.cabinets[cabinetId];
  if (!cab) return { error: `柜子 ${cabinetId} 不存在` };
  if (!cab.sections) cab.sections = {};
  if (!cab.sections[sectionId]) {
    cab.sections[sectionId] = { id: sectionId, name: sectionId, items: [], createdAt: nowISO(), updatedAt: nowISO() };
  }
  const sec = cab.sections[sectionId];
  if (!sec.items) sec.items = [];

  const item = {
    id: String(Date.now()),
    name: itemData.name || '',
    tags: itemData.tags || [],
    aliases: itemData.aliases || [],
    qty: itemData.qty || 1,
    note: itemData.note || '',
    createdAt: nowISO(), updatedAt: nowISO()
  };

  const existing = sec.items.find(i => i.name === item.name);
  if (existing) {
    existing.qty += item.qty;
    existing.updatedAt = nowISO();
    if (itemData.note) existing.note = itemData.note;
    if (itemData.tags && itemData.tags.length) existing.tags = itemData.tags;
    if (itemData.aliases && itemData.aliases.length) existing.aliases = itemData.aliases;
  } else {
    sec.items.push(item);
  }
  sec.updatedAt = nowISO();
  cab.updatedAt = nowISO();
  saveData(data);
  return { success: true, item: existing || item, merged: !!existing };
}

function updateItem(itemId, updates) {
  const data = loadData();
  const result = findItemById(data, itemId);
  if (!result) return { error: `物品 ${itemId} 不存在` };
  const { item, cabinet } = result;
  if (updates.name !== undefined) item.name = updates.name;
  if (updates.qty !== undefined) item.qty = updates.qty;
  if (updates.note !== undefined) item.note = updates.note;
  if (updates.tags !== undefined) item.tags = updates.tags;
  if (updates.aliases !== undefined) item.aliases = updates.aliases;
  item.updatedAt = nowISO();
  cabinet.updatedAt = nowISO();
  saveData(data);
  return { success: true, item };
}

function removeItem(itemId, qty) {
  const data = loadData();
  const result = findItemById(data, itemId);
  if (!result) return { error: `物品 ${itemId} 不存在` };
  const { cabinet, section, itemIndex, item } = result;
  if (qty !== undefined) {
    if (!Number.isInteger(qty) || qty <= 0) return { error: '数量必须为正整数' };
    if (qty < item.qty) {
      item.qty -= qty;
      item.updatedAt = nowISO();
    } else {
      section.items.splice(itemIndex, 1);
    }
  } else {
    section.items.splice(itemIndex, 1);
  }
  section.updatedAt = nowISO();
  cabinet.updatedAt = nowISO();
  saveData(data);
  return { success: true, item: item.qty > 0 ? item : null };
}

function findItemById(data, itemId) {
  for (const [cabId, cabinet] of Object.entries(data.cabinets)) {
    for (const [secId, section] of Object.entries(cabinet.sections || {})) {
      const idx = (section.items || []).findIndex(i => i.id === itemId);
      if (idx !== -1) {
        return { cabinet, section, itemIndex: idx, item: section.items[idx], cabinetId: cabId, sectionId: secId };
      }
    }
  }
  return null;
}

// ========== 导出 ==========

function exportCSV() {
  const data = loadData();
  const rows = [['柜号', '柜名', '分段', '物品名', '数量', '标签', '备注']];
  for (const [cabId, cabinet] of Object.entries(data.cabinets)) {
    for (const [secId, section] of Object.entries(cabinet.sections || {})) {
      for (const item of (section.items || [])) {
        rows.push([cabId, cabinet.name, secId, item.name, String(item.qty), (item.tags || []).join(';'), item.note || '']);
      }
    }
  }
  return rows.map(r => r.map(c => '"' + String(c).replace(/"/g, '""') + '"').join(',')).join('\n');
}

module.exports = {
  loadData, saveData, backupData,
  listCabinets, getCabinet, addCabinet, updateCabinet, deleteCabinet,
  addSection, updateSection, deleteSection,
  addItem, updateItem, removeItem,
  findItemById, exportCSV, countSectionItems
};
