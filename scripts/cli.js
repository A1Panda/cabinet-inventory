#!/usr/bin/env node
/**
 * 柜子管家 CLI — 命令行工具
 * 用法: node scripts/cli.js <命令> <子命令> [参数...]
 *
 * 柜子:   cabinet list | add <id> <name> [desc] | show <id> | update <id> [--name x] [--desc x] | delete <id>
 * 分段:   section list <cabId> | add <cabId> <secId> [name] | update <cabId> <secId> --name x | delete <cabId> <secId>
 * 物品:   item add <cabId> <secId> <name> <qty> [--tags a,b] [--aliases x,y] [--note xxx]
 *         item take <itemId> [qty]       取走N个（不填全取）
 *         item del <itemId>              删除
 *         item update <itemId> --name xxx --qty N
 * 搜索:   search <关键词>
 * 统计:   stats
 * 导出:   export
 * 备份:   backup
 */

const store = require('./store');
const finder = require('./find');

const args = process.argv.slice(2);
if (args.length === 0) { usage(); process.exit(0); }

const command = args[0];
const sub = args[1];

// 解析 --key value 和一系列位置参数
function parseFlags(startIdx) {
  const positional = [];
  const flags = {};
  for (let i = startIdx; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith('--')) {
        flags[key] = args[++i];
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(args[i]);
    }
  }
  return { positional, flags };
}

function fail(msg) { console.error('✗ ' + msg); process.exit(1); }

// ==================== 命令分发 ====================

if (command === 'cabinet') {
  if (sub === 'list') {
    const list = store.listCabinets();
    if (!list.length) { console.log('（暂无柜子）'); return; }
    console.log('柜号  名称          位置描述              分段数');
    console.log('──    ────          ────────              ────');
    for (const c of list) {
      console.log(`${pad(c.id,5)} ${pad(c.name,12)} ${pad(c.location_desc||'-',20)} ${c.sectionCount}`);
    }
  }
  else if (sub === 'add') {
    const [id, name, ...rest] = args.slice(2);
    if (!id || !name) fail('用法: cabinet add <id> <name> [位置描述]');
    const r = store.addCabinet(id, name, rest.join(' '));
    if (r.error) fail(r.error);
    console.log(`✓ 柜子 ${id}「${name}」已添加`);
  }
  else if (sub === 'show') {
    const id = args[2];
    if (!id) fail('用法: cabinet show <id>');
    const cab = store.getCabinet(id);
    if (!cab) fail(`柜子 ${id} 不存在`);
    console.log(`柜子 ${cab.id} - ${cab.name}`);
    if (cab.location_desc) console.log(`位置: ${cab.location_desc}`);
    const secs = cab.sections || {};
    const secIds = Object.keys(secs);
    console.log(`分段: ${secIds.length ? secIds.join(', ') : '（无）'}\n`);
    for (const [secId, sec] of Object.entries(secs)) {
      const items = sec.items || [];
      const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);
      console.log(`  ${secId} (${sec.name || secId}) - ${items.length} 种, ${totalQty} 件`);
      for (const item of items) {
        console.log(`    ${item.name} ×${item.qty}`);
        if (item.tags && item.tags.length) console.log(`    标签: ${item.tags.join(', ')}`);
        if (item.aliases && item.aliases.length) console.log(`    别名: ${item.aliases.join(', ')}`);
        if (item.note) console.log(`    备注: ${item.note}`);
      }
    }
  }
  else if (sub === 'delete') {
    const id = args[2];
    if (!id) fail('用法: cabinet delete <id>');
    const r = store.deleteCabinet(id);
    if (r.error) fail(r.error);
    console.log(`✓ 柜子 ${id} 已删除`);
  }
  else if (sub === 'update') {
    const id = args[2];
    if (!id) fail('用法: cabinet update <id> --name xxx --desc xxx');
    const { flags } = parseFlags(3);
    const updates = {};
    if (flags.name) updates.name = flags.name;
    if (flags.desc !== undefined) updates.location_desc = flags.desc;
    if (!Object.keys(updates).length) fail('请提供至少一个要更新的字段（--name / --desc）');
    const r = store.updateCabinet(id, updates);
    if (r.error) fail(r.error);
    console.log(`✓ 柜子 ${id} 已更新`);
  }
  else fail(`未知命令: cabinet ${sub}`);
}

else if (command === 'section') {
  if (sub === 'list') {
    const cabId = args[2];
    if (!cabId) fail('用法: section list <cabinetId>');
    const cab = store.getCabinet(cabId);
    if (!cab) fail(`柜子 ${cabId} 不存在`);
    const secs = cab.sections || {};
    const secIds = Object.keys(secs);
    if (!secIds.length) { console.log(`柜子 ${cabId} 暂无分段`); return; }
    console.log(`柜子 ${cabId}「${cab.name}」分段列表:`);
    console.log('分段ID  名称    物品种类数  总数量');
    console.log('────    ────    ────────  ────');
    for (const [secId, sec] of Object.entries(secs)) {
      const items = sec.items || [];
      const itemCount = items.length;
      const totalQty = items.reduce((s, i) => s + (i.qty || 0), 0);
      console.log(`${pad(secId,8)} ${pad(sec.name || secId,8)} ${pad(String(itemCount),10)} ${totalQty}`);
    }
  }
  else if (sub === 'add') {
    const [cabId, secId, ...rest] = args.slice(2);
    if (!cabId || !secId) fail('用法: section add <cabinetId> <sectionId> [名称]');
    const r = store.addSection(cabId, secId, rest.join(' '));
    if (r.error) fail(r.error);
    console.log(`✓ 分段 ${secId} 已添加到柜子 ${cabId}`);
  }
  else if (sub === 'update') {
    const [cabId, secId] = args.slice(2);
    if (!cabId || !secId) fail('用法: section update <cabinetId> <sectionId> --name xxx');
    const { flags } = parseFlags(4);
    if (!flags.name) fail('请提供 --name 参数');
    const r = store.updateSection(cabId, secId, { name: flags.name });
    if (r.error) fail(r.error);
    console.log(`✓ 分段 ${secId} 已更新`);
  }
  else if (sub === 'delete') {
    const [cabId, secId] = args.slice(2);
    if (!cabId || !secId) fail('用法: section delete <cabinetId> <sectionId>');
    const r = store.deleteSection(cabId, secId);
    if (r.error) fail(r.error);
    console.log(`✓ 分段 ${secId} 从柜子 ${cabId} 已删除`);
  }
  else fail(`未知命令: section ${sub}`);
}

else if (command === 'item') {
  const { positional, flags } = parseFlags(2);
  const [cabId, secId, name, qtyStr] = positional;

  if (sub === 'add') {
    if (!cabId || !secId || !name) fail('用法: item add <cabinetId> <sectionId> <名称> <数量> [--tags a,b] [--aliases x,y] [--note xxx]');
    const qty = parseInt(qtyStr);
    if (!Number.isInteger(qty) || qty <= 0) fail('数量必须为正整数，如: 1, 10, 100');
    const tags = flags.tags ? flags.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    const aliases = flags.aliases ? flags.aliases.split(',').map(a => a.trim()).filter(Boolean) : [];
    const r = store.addItem(cabId, secId, {
      name, qty, tags, aliases, note: flags.note || ''
    });
    if (r.error) fail(r.error);
    console.log(`✓ ${r.merged ? '已合并到已有物品' : '已存入'}: ${name} ×${r.item.qty} → ${cabId} / ${secId}`);
  }
  else if (sub === 'take') {
    const itemId = cabId; // 第一个位置参数就是 itemId
    if (!itemId) fail('用法: item take <itemId> [数量]');
    const qty = secId !== undefined ? parseInt(secId) : undefined;
    if (secId !== undefined && (!Number.isInteger(qty) || qty <= 0)) fail('数量必须为正整数');
    const r = store.removeItem(itemId, qty);
    if (r.error) fail(r.error);
    if (r.item) {
      console.log(`✓ 已拿走${qty || '全部'}: ${r.item.name} 剩余: ${r.item.qty}`);
    } else {
      console.log('✓ 已全部取走（物品已移除）');
    }
  }
  else if (sub === 'del') {
    const itemId = cabId;
    if (!itemId) fail('用法: item del <itemId>');
    const r = store.removeItem(itemId);
    if (r.error) fail(r.error);
    console.log(`✓ 已删除${r.item ? ': ' + r.item.name : ''}`);
  }
  else if (sub === 'update') {
    const itemId = cabId;
    if (!itemId) fail('用法: item update <itemId> --name xxx --qty N');
    const updates = {};
    if (flags.name) updates.name = flags.name;
    if (flags.qty) updates.qty = parseInt(flags.qty);
    if (flags.tags) updates.tags = flags.tags.split(',').map(t => t.trim()).filter(Boolean);
    if (flags.aliases) updates.aliases = flags.aliases.split(',').map(a => a.trim()).filter(Boolean);
    if (flags.note !== undefined) updates.note = flags.note;
    if (!Object.keys(updates).length) fail('请提供至少一个要更新的字段');
    const r = store.updateItem(itemId, updates);
    if (r.error) fail(r.error);
    console.log(`✓ 已更新: ${r.item.name} ×${r.item.qty}`);
  }
  else fail(`未知命令: item ${sub}`);
}

else if (command === 'search') {
  const keyword = args.slice(1).join(' ');
  if (!keyword) fail('用法: search <关键词>');
  const results = finder.search(keyword);
  if (!results.length) { console.log(`未找到匹配「${keyword}」的物品`); return; }
  console.log(`找到 ${results.length} 个结果:\n`);
  for (const r of results) {
    console.log(`  [${r.cabinetId} / ${r.sectionId}] ${r.item.name} ×${r.item.qty}  (ID: ${r.item.id})`);
    if (r.item.tags && r.item.tags.length) console.log(`  标签: ${r.item.tags.join(', ')}`);
    if (r.item.aliases && r.item.aliases.length) console.log(`  别名: ${r.item.aliases.join(', ')}`);
    if (r.item.note) console.log(`  备注: ${r.item.note}`);
    console.log('');
  }
}

else if (command === 'stats') {
  const s = finder.getStats();
  console.log(`柜子总数: ${s.cabinetCount}    物品种类: ${s.totalItems}    总数量: ${s.totalQty}\n`);
  if ((s.cabinets || []).length) {
    console.log(`${pad('柜子',6)} ${pad('名称',14)} ${pad('分段',4)} ${pad('种类',4)} ${pad('总数',4)}`);
    console.log('──     ──────       ──   ──   ──');
    for (const c of s.cabinets) {
      console.log(`${pad(c.id,6)} ${pad(c.name,14)} ${pad(String(c.sectionCount),4)} ${pad(String(c.itemCount),4)} ${pad(String(c.totalQty),4)}`);
    }
  }
}

else if (command === 'export') {
  console.log(store.exportCSV());
}

else if (command === 'backup') {
  store.backupData();
  console.log('✓ 备份完成');
}

else if (command === 'help' || command === '--help' || command === '-h') {
  usage();
}

else {
  console.error(`未知命令: ${command}`);
  usage();
  process.exit(1);
}

// ==================== 工具函数 ====================

function pad(str, len) {
  str = String(str);
  // 中文字符算2个宽度
  let w = 0;
  for (const ch of str) w += ch.charCodeAt(0) > 255 ? 2 : 1;
  return str + ' '.repeat(Math.max(0, len - w));
}

function usage() {
  console.log(`柜子管家 CLI

用法: node scripts/cli.js <命令> [子命令] [参数]

柜子管理:
  cabinet list                          列出所有柜子
  cabinet add <id> <name> [描述]         添加柜子
  cabinet show <id>                     查看柜子详情（含物品清单）
  cabinet update <id> --name xxx --desc xxx
                                        更新柜子名称或位置描述
  cabinet delete <id>                   删除柜子

分段管理:
  section list <cabId>                  列出柜子的所有分段
  section add <cabId> <secId> [名称]    添加分段
  section update <cabId> <secId> --name xxx
                                        更新分段名称
  section delete <cabId> <secId>        删除分段（需为空）

物品管理:
  item add <cabId> <secId> <名称> <数量> [--tags a,b] [--aliases x,y] [--note xxx]
                                        存入物品
  item take <itemId> [数量]             取走物品（不填数量则全部取走）
  item del <itemId>                     删除物品
  item update <itemId> [--name xxx] [--qty N] [--tags a,b] [--note xxx]
                                        更新物品信息

查询与工具:
  search <关键词>                        搜索物品（结果包含物品ID）
  stats                                 统计概览
  export                                导出CSV
  backup                                手动备份
`);
}
