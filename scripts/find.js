/**
 * 柜子管家 - 搜索模块
 * 遍历：柜子 → 分段 → 物品
 */

const { loadData } = require('./store');

function search(keyword) {
  const data = loadData();
  const results = [];
  const kw = keyword.toLowerCase();

  for (const [cabId, cabinet] of Object.entries(data.cabinets)) {
    for (const [secId, section] of Object.entries(cabinet.sections || {})) {
      for (const item of (section.items || [])) {
        const matchName = item.name.toLowerCase().includes(kw);
        const matchTags = (item.tags || []).some(t => t.toLowerCase().includes(kw));
        const matchAliases = (item.aliases || []).some(a => a.toLowerCase().includes(kw));
        const matchNote = (item.note || '').toLowerCase().includes(kw);

        if (matchName || matchTags || matchAliases || matchNote) {
          results.push({
            item: { ...item },
            cabinetId: cabId,
            cabinetName: cabinet.name,
            sectionId: secId,
            location_desc: cabinet.location_desc || ''
          });
        }
      }
    }
  }
  return results;
}

function listCabinetItems(cabinetId) {
  const data = loadData();
  const cabinet = data.cabinets[cabinetId];
  if (!cabinet) return null;
  const sections = {};
  for (const [secId, section] of Object.entries(cabinet.sections || {})) {
    sections[secId] = { name: section.name || secId, items: section.items || [] };
  }
  return { id: cabinetId, name: cabinet.name, location_desc: cabinet.location_desc || '', sections };
}

function getStats() {
  const data = loadData();
  let totalItems = 0, totalQty = 0;
  const cabinetStats = [];

  for (const [cabId, cabinet] of Object.entries(data.cabinets)) {
    let cabItemCount = 0, cabQty = 0;
    for (const section of Object.values(cabinet.sections || {})) {
      cabItemCount += (section.items || []).length;
      cabQty += (section.items || []).reduce((s, i) => s + (i.qty || 0), 0);
    }
    totalItems += cabItemCount; totalQty += cabQty;
    cabinetStats.push({ id: cabId, name: cabinet.name, sectionCount: Object.keys(cabinet.sections || {}).length, itemCount: cabItemCount, totalQty: cabQty });
  }

  return { cabinetCount: Object.keys(data.cabinets).length, totalItems, totalQty, cabinets: cabinetStats };
}

module.exports = { search, listCabinetItems, getStats };
