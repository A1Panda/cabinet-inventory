/**
 * 柜子管家 - WebUI (Alpine.js)
 * 柜子 → 分段 → 物品
 */

const API = {
  async get(p) { const r = await fetch(p); return r.json(); },
  async post(p, b) { const r = await fetch(p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return r.json(); },
  async put(p, b) { const r = await fetch(p, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) }); return r.json(); },
  async del(p, b) { const r = await fetch(p, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: b ? JSON.stringify(b) : undefined }); return r.json(); }
};

document.addEventListener('alpine:init', () => {
  Alpine.data('app', () => ({
    // ---- 状态 ----
    cabinets: [],
    expandedCabinet: null,
    cabinetDetail: null,
    cabinetLoading: false,
    expandedSections: {},
    takeQtys: {},

    searchQuery: '',
    searchResults: null,

    modal: { cabinet: false, section: false, item: false, stats: false },
    statsData: null,

    cabinetForm: { id: '', name: '', location: '', _editing: false },
    sectionForm: { cabinetId: '', id: '', name: '' },
    itemForm: { cabinetId: '', sectionId: '', name: '', qty: 1, tags: '', aliases: '', note: '' },

    isDark: localStorage.getItem('theme') === 'dark',
    toastTimer: null,
    toast: { show: false, msg: '', type: '' },

    // ---- 初始化 ----
    async init() {
      const r = await API.get('/api/cabinets');
      this.cabinets = r || [];
    },

    // ---- 数据刷新 ----
    async loadData() {
      const r = await API.get('/api/cabinets');
      this.cabinets = r || [];
      if (this.expandedCabinet) {
        this.cabinetDetail = await API.get('/api/cabinets/' + this.expandedCabinet);
      }
    },

    // ---- 柜子展开/折叠 ----
    async toggleCabinet(cabId) {
      if (this.expandedCabinet === cabId) {
        this.expandedCabinet = null;
        this.cabinetDetail = null;
        this.expandedSections = {};
        return;
      }
      this.expandedCabinet = cabId;
      this.cabinetDetail = null;
      this.cabinetLoading = true;
      this.expandedSections = {};
      this.cabinetDetail = await API.get('/api/cabinets/' + cabId);
      this.cabinetLoading = false;
    },

    toggleSection(secId) {
      if (this.expandedSections[secId]) {
        this.expandedSections[secId] = false;
      } else {
        this.expandedSections[secId] = true;
      }
    },

    countSectionItems(sec) {
      return (sec.items || []).reduce((s, i) => s + (i.qty || 0), 0);
    },

    // ---- 柜子 CRUD ----
    openCabinetForm(cabId) {
      if (cabId) {
        const c = this.cabinets.find(x => x.id === cabId);
        if (!c) return;
        this.cabinetForm = { id: c.id, name: c.name, location: c.location_desc || '', _editing: true };
      } else {
        this.cabinetForm = { id: '', name: '', location: '', _editing: false };
      }
      this.modal.cabinet = true;
    },

    async saveCabinet() {
      const f = this.cabinetForm;
      const id = f.id.trim().toUpperCase();
      const name = f.name.trim();
      if (!id || !name) { this.toastMsg('柜号和名称为必填', 'error'); return; }
      let r;
      if (f._editing) {
        r = await API.put('/api/cabinets/' + id, { name, location_desc: f.location.trim() });
      } else {
        r = await API.post('/api/cabinets', { id, name, location_desc: f.location.trim() });
      }
      if (r.error) { this.toastMsg(r.error, 'error'); return; }
      this.toastMsg(f._editing ? '柜子已更新' : '柜子已添加', 'success');
      this.modal.cabinet = false;
      this.loadData();
    },

    async deleteCabinet(id) {
      if (!confirm('确定删除柜子 ' + id + '？包含的所有分段和物品将被删除。')) return;
      const r = await API.del('/api/cabinets/' + id);
      if (r.error) { this.toastMsg(r.error, 'error'); return; }
      if (this.expandedCabinet === id) { this.expandedCabinet = null; this.cabinetDetail = null; }
      this.toastMsg('柜子已删除', 'success');
      this.loadData();
    },

    // ---- 分段 CRUD ----
    openSectionForm(cabId) {
      this.sectionForm = { cabinetId: cabId, id: '', name: '' };
      this.modal.section = true;
      this.$nextTick(() => { this.$refs.sectionIdInput?.focus(); });
    },

    async saveSection() {
      const f = this.sectionForm;
      if (!f.id.trim()) { this.toastMsg('请输入分段编号', 'error'); return; }
      const r = await API.post('/api/cabinets/' + f.cabinetId + '/sections', { sectionId: f.id.trim(), name: f.name.trim() });
      if (r.error) { this.toastMsg(r.error, 'error'); return; }
      this.toastMsg('分段已添加', 'success');
      this.modal.section = false;
      this.loadData();
    },

    async deleteSection(cabId, secId) {
      if (!confirm('确定删除分段 ' + secId + '？')) return;
      const r = await API.del('/api/cabinets/' + cabId + '/sections/' + secId);
      if (r.error) { this.toastMsg(r.error, 'error'); return; }
      this.toastMsg('分段已删除', 'success');
      this.loadData();
    },

    // ---- 物品 CRUD ----
    openItemForm(cabId, secId) {
      this.itemForm = { cabinetId: cabId, sectionId: secId, name: '', qty: 1, tags: '', aliases: '', note: '' };
      this.modal.item = true;
    },

    async saveItem() {
      const f = this.itemForm;
      if (!f.name.trim()) { this.toastMsg('请输入物品名称', 'error'); return; }
      const r = await API.post('/api/items', {
        cabinetId: f.cabinetId,
        sectionId: f.sectionId,
        name: f.name.trim(),
        qty: parseInt(f.qty) || 1,
        tags: f.tags.split(',').map(t => t.trim()).filter(Boolean),
        aliases: f.aliases.split(',').map(a => a.trim()).filter(Boolean),
        note: f.note.trim()
      });
      if (r.error) { this.toastMsg(r.error, 'error'); return; }
      this.toastMsg(r.merged ? '已合并到已有物品' : '物品已存入', 'success');
      this.modal.item = false;
      this.loadData();
    },

    async addItem(itemId, currentQty) {
      const addQty = parseInt(this.takeQtys[itemId]) || 1;
      if (addQty < 1) { this.toastMsg('数量无效', 'error'); return; }
      const newQty = currentQty + addQty;
      const r = await API.put('/api/items/' + itemId, { qty: newQty });
      if (r.error) { this.toastMsg(r.error, 'error'); return; }
      this.toastMsg('已存入 ' + addQty + ' 个', 'success');
      this.takeQtys[itemId] = 1;
      this.loadData();
    },

    async takeItem(itemId, maxQty) {
      const qty = parseInt(this.takeQtys[itemId]) || 1;
      if (qty < 1 || qty > maxQty) { this.toastMsg('数量无效 (1~' + maxQty + ')', 'error'); return; }
      const r = await API.del('/api/items/' + itemId, { qty });
      if (r.error) { this.toastMsg(r.error, 'error'); return; }
      this.toastMsg('已取走 ' + qty + ' 个', 'success');
      this.takeQtys[itemId] = 1;
      this.loadData();
    },

    async deleteItem(itemId) {
      if (!confirm('确定删除该物品？')) return;
      const r = await API.del('/api/items/' + itemId);
      if (r.error) { this.toastMsg(r.error, 'error'); return; }
      this.toastMsg('物品已删除', 'success');
      this.loadData();
    },

    // ---- 搜索 ----
    async doSearch() {
      const q = this.searchQuery.trim();
      if (!q) { this.searchResults = null; return; }
      const results = await API.get('/api/search?q=' + encodeURIComponent(q));
      this.searchResults = results || [];
    },

    clearSearch() {
      this.searchQuery = '';
      this.searchResults = null;
    },

    highlight(text, query) {
      if (!text || !query) return text || '';
      const escaped = this._esc(text);
      const kw = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return escaped.replace(new RegExp('(' + kw + ')', 'gi'), '<mark>$1</mark>');
    },

    // ---- 统计/导出/备份 ----
    async openStats() {
      this.modal.stats = true;
      this.statsData = null;
      this.statsData = await API.get('/api/stats');
    },

    exportCSV() { window.open('/api/export', '_blank'); },

    async manualBackup() {
      const r = await API.post('/api/backup');
      this.toastMsg(r.error || '备份完成', r.error ? 'error' : 'success');
    },

    // ---- 主题 ----
    toggleTheme() {
      this.isDark = !this.isDark;
      localStorage.setItem('theme', this.isDark ? 'dark' : 'light');
    },

    // ---- Toast ----
    toastMsg(msg, type = '') {
      clearTimeout(this.toastTimer);
      this.toast = { show: true, msg, type };
      this.toastTimer = setTimeout(() => { this.toast.show = false; }, 2500);
    },

    // ---- 工具 ----
    _esc(s) {
      const d = document.createElement('div');
      d.textContent = s;
      return d.innerHTML;
    }
  }));
});
