import { auth, db, provider } from './js/firebase.js';
import { signInWithPopup, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, writeBatch, getDocs
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { escHtml, toArray, createIcons } from './js/utils.js';
import { renderCategories, renderStores, populateStoreSelect } from './js/categories.js';
import { syncThemeUI, toggleTheme } from './js/theme.js';
import { state } from './js/state.js';
import { seedDefaultsIfNeeded, seedTemplatesIfNeeded } from './js/seed.js';
import { renderLists, openList as _openList, updateListCounts as _updateListCounts } from './js/lists.js';
import {
  renderItems as _renderItems,
  openAddItemModal as _openAddItemModal,
  openEditItemModal as _openEditItemModal,
  populateItemStoreCheckboxes,
  getSelectedStores,
  toggleItem as _toggleItem,
  saveItem as _saveItem
} from './js/items.js';
import { navigateTo, closeSidebar, initNav } from './js/nav.js';

// ── Hash-based list restore ─────────────────────────────────────────────────────────────
function getHashListId() {
  const m = window.location.hash.match(/^#list\/(.+)$/);
  return m ? m[1] : null;
}
function setHashListId(listId) {
  history.replaceState(null, '', listId ? `#list/${listId}` : '#');
}

// ── Firestore Helpers ──────────────────────────────────────────────────────────────────────
const uid = () => state.currentUser.uid;
const listsCol = () => collection(db, 'users', uid(), 'lists');
const itemsCol = (listId) => collection(db, 'users', uid(), 'lists', listId, 'items');
const categoriesCol = () => collection(db, 'users', uid(), 'categories');
const storesCol = () => collection(db, 'users', uid(), 'stores');
const templatesCol = () => collection(db, 'users', uid(), 'templates');

// ── Local wrappers binding deps ───────────────────────────────────────────────────────────
function openList(listId) {
  _openList(listId, { navigateTo, setHashListId, onSnapshot, itemsCol, renderItems, updateListCounts });
}
function updateListCounts(listId) {
  _updateListCounts(listId, { listsCol, updateDoc, doc });
}
function renderItems() {
  _renderItems(toggleItem, openEditItemModal);
}
function toggleItem(itemId) {
  _toggleItem(itemId, { itemsCol });
}
function openAddItemModal(prefillName = '') {
  _openAddItemModal(buildCategoryOptions);
  if (prefillName) document.getElementById('item-name-full').value = prefillName;
}
function openEditItemModal(itemId) {
  _openEditItemModal(itemId, buildCategoryOptions);
}

function teardownSubscriptions() {
  if (state.unsubLists)     { state.unsubLists();     state.unsubLists     = null; }
  if (state.unsubItems)     { state.unsubItems();     state.unsubItems     = null; }
  if (state.unsubCategories){ state.unsubCategories();state.unsubCategories= null; }
  if (state.unsubStores)    { state.unsubStores();    state.unsubStores    = null; }
  if (state.unsubTemplates) { state.unsubTemplates(); state.unsubTemplates = null; }
  state.allLists = []; state.allItems = []; state.allCategories = []; state.allStores = []; state.allTemplates = [];
}

function subscribeToData() {
  state.listsFirstLoad = true;
  seedDefaultsIfNeeded(state.currentUser);
  seedTemplatesIfNeeded(state.currentUser);
  subscribeToTemplates();

  state.unsubCategories = onSnapshot(query(categoriesCol(), orderBy('createdAt')), snap => {
    state.allCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCategories(state.allCategories, confirmDelete);
    populateCategorySelects();
  });

  state.unsubStores = onSnapshot(query(storesCol(), orderBy('createdAt')), snap => {
    state.allStores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStores(state.allStores, confirmDelete);
    populateStoreSelect(state.allStores);
  });

  state.unsubLists = onSnapshot(query(listsCol(), orderBy('createdAt', 'desc')), snap => {
    state.allLists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLists(openList, confirmDelete);
    document.getElementById('badge-lists').textContent = state.allLists.length;
    if (state.listsFirstLoad) {
      state.listsFirstLoad = false;
      const restoreId = state.pendingListId;
      state.pendingListId = null;
      if (restoreId && state.allLists.find(l => l.id === restoreId)) openList(restoreId);
    }
  });
}

// ── Category Selects ────────────────────────────────────────────────────────────────────
function buildCategoryOptions(selectedCategory = '') {
  const blank = `<option value="">-- No category --</option>`;
  const opts = state.allCategories.map(c =>
    `<option value="${escHtml(c.name)}" ${c.name === selectedCategory ? 'selected' : ''}>${c.emoji ? c.emoji + ' ' : ''}${escHtml(c.name)}</option>`
  ).join('');
  return blank + opts;
}

function populateCategorySelects(selectedItem = '', selectedTplItem = '') {
  const itemSel = document.getElementById('item-category');
  const tplSel  = document.getElementById('tpl-item-category');
  if (itemSel) itemSel.innerHTML = buildCategoryOptions(selectedItem);
  if (tplSel)  tplSel.innerHTML  = buildCategoryOptions(selectedTplItem);
}

// ── Templates ────────────────────────────────────────────────────────────────────────
function subscribeToTemplates() {
  state.unsubTemplates = onSnapshot(query(templatesCol(), orderBy('createdAt')), snap => {
    state.allTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTemplates();
  });
}

function renderTemplates() {
  const grid = document.getElementById('templates-grid');
  if (!grid) return;
  if (state.allTemplates.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><i data-lucide="layout-template"></i></div><h3>No templates yet</h3><p>Create a template to quickly start new lists.</p></div>`;
    createIcons(); return;
  }
  grid.innerHTML = state.allTemplates.map(t => {
    const items = t.items || [];
    const preview = items.slice(0, 5);
    const more = items.length - preview.length;
    const chips = preview.map(it => {
      const cat = state.allCategories.find(c => c.name === (it.category || ''));
      const prefix = cat?.emoji ? cat.emoji + ' ' : '';
      return `<span class="template-item-chip">${prefix}${escHtml(it.name || it)}</span>`;
    }).join('');
    const moreChip = more > 0 ? `<span class="template-item-chip">+${more} more</span>` : '';
    return `<div class="template-card" data-tpl-id="${t.id}" style="cursor:pointer;" title="Edit template">
      <div class="template-card-emoji">${t.emoji || '📋'}</div>
      <div><div class="template-card-title">${escHtml(t.name)}</div><div class="template-card-desc">${escHtml(t.desc || '')}</div></div>
      <div class="template-card-items">${chips}${moreChip}</div>
      <div class="template-card-footer">
        <span class="template-item-count">${items.length} item${items.length !== 1 ? 's' : ''}</span>
      </div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.template-card').forEach(card =>
    card.addEventListener('click', () => openTemplateEditor(card.dataset.tplId))
  );
  createIcons();
}

// ── Template Editor ──────────────────────────────────────────────────────────────────────
function openTemplateEditor(tplId) {
  state.editingTemplateId = tplId || null;
  const tpl = tplId ? state.allTemplates.find(t => t.id === tplId) : null;
  document.getElementById('tpl-editor-title').textContent = tpl ? 'Edit Template' : 'New Template';
  document.getElementById('tpl-emoji').value = tpl ? (tpl.emoji || '') : '';
  document.getElementById('tpl-name').value  = tpl ? tpl.name          : '';
  document.getElementById('tpl-desc').value  = tpl ? (tpl.desc  || '') : '';
  document.getElementById('tpl-delete-btn').style.display = tpl ? 'inline-flex' : 'none';
  state.tplEditorItems = tpl ? (tpl.items || []).map(normaliseItem) : [];
  renderTplEditorItems();
  openModal('modal-template-editor');
}

function normaliseItem(it) {
  if (typeof it === 'string') return { name: it, qty: '', unit: '', category: '', stores: [], tags: [], notes: '' };
  return {
    name:     it.name     || '',
    qty:      it.qty      || '',
    unit:     it.unit     || '',
    category: it.category || '',
    stores:   toArray(it.stores),
    tags:     toArray(it.tags),
    notes:    it.notes    || ''
  };
}

function renderTplEditorItems() {
  const container = document.getElementById('tpl-editor-items');
  if (!container) return;
  const count = state.tplEditorItems.length;
  document.getElementById('tpl-item-count').textContent = `${count} item${count !== 1 ? 's' : ''}`;
  if (count === 0) {
    container.innerHTML = `<div style="font-size:var(--text-xs);color:var(--color-text-faint);text-align:center;padding:var(--space-4) var(--space-2);">No items yet — click "Add Item" below</div>`;
    return;
  }
  container.innerHTML = state.tplEditorItems.map((it, i) => {
    const qty   = it.qty  ? `<span class="item-qty-badge">${escHtml(it.qty)}${it.unit ? ' '+escHtml(it.unit) : ''}</span>` : '';
    const cat   = it.category ? `<span class="item-tag-chip"><i data-lucide="tag" style="width:10px;height:10px;"></i>${escHtml(it.category)}</span>` : '';
    const store = toArray(it.stores).map(s => `<span class="item-store-chip"><i data-lucide="store" style="width:10px;height:10px;"></i>${escHtml(s)}</span>`).join('');
    const tags  = toArray(it.tags).map(t => `<span class="item-tag-chip">${escHtml(t)}</span>`).join('');
    const notes = it.notes ? `<span style="color:var(--color-text-faint);font-size:var(--text-xs);">${escHtml(it.notes)}</span>` : '';
    const meta  = [qty, cat, store, tags, notes].filter(Boolean).join('');
    return `<div class="item-row" data-tpl-item-idx="${i}" style="cursor:pointer;" title="Click to edit">
      <div class="item-info" style="flex:1;min-width:0;">
        <div class="item-name">${escHtml(it.name || '(unnamed)')}</div>
        ${meta ? `<div class="item-meta">${meta}</div>` : ''}
      </div>
      <button class="icon-btn" data-tpl-item-edit="${i}" aria-label="Edit item" title="Edit item" style="color:var(--color-text-muted);"><i data-lucide="pencil"></i></button>
      <button class="icon-btn" data-tpl-item-remove="${i}" aria-label="Remove item" style="color:var(--color-error);"><i data-lucide="x"></i></button>
    </div>`;
  }).join('');

  container.querySelectorAll('[data-tpl-item-edit]').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); openTplItemModal(parseInt(btn.dataset.tplItemEdit)); })
  );
  container.querySelectorAll('[data-tpl-item-remove]').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); state.tplEditorItems.splice(parseInt(btn.dataset.tplItemRemove), 1); renderTplEditorItems(); })
  );
  container.querySelectorAll('[data-tpl-item-idx]').forEach(row =>
    row.addEventListener('click', e => { if (e.target.closest('button')) return; openTplItemModal(parseInt(row.dataset.tplItemIdx)); })
  );
  createIcons();
}

// ── Template Item Modal ─────────────────────────────────────────────────────────────────────
function populateTplItemStoreCheckboxes(selectedStores = []) {
  const container = document.getElementById('tpl-item-store-checkboxes');
  if (!container) return;
  if (state.allStores.length === 0) {
    container.innerHTML = `<span style="font-size:var(--text-xs);color:var(--color-text-faint);">No stores yet — add some in the Stores view.</span>`;
    return;
  }
  container.innerHTML = state.allStores.map(s =>
    `<label class="store-checkbox-label"><input type="checkbox" value="${escHtml(s.name)}" ${selectedStores.includes(s.name) ? 'checked' : ''}><span>${escHtml(s.name)}</span></label>`
  ).join('');
}
function getTplItemSelectedStores() {
  return Array.from(document.getElementById('tpl-item-store-checkboxes')?.querySelectorAll('input[type=checkbox]:checked') || []).map(cb => cb.value);
}

function openTplItemModal(idx) {
  state.tplItemEditingIdx = idx;
  const it = idx >= 0 ? state.tplEditorItems[idx] : null;
  document.getElementById('tpl-item-modal-title').textContent = it ? 'Edit Item' : 'Add Item';
  document.getElementById('tpl-item-name').value  = it ? it.name  : '';
  document.getElementById('tpl-item-qty').value   = it ? it.qty   : '';
  document.getElementById('tpl-item-unit').value  = it ? it.unit  : '';
  document.getElementById('tpl-item-tags').value  = it ? toArray(it.tags).join(', ')  : '';
  document.getElementById('tpl-item-notes').value = it ? it.notes : '';
  const tplCatSel = document.getElementById('tpl-item-category');
  if (tplCatSel) tplCatSel.innerHTML = buildCategoryOptions(it ? it.category : '');
  populateTplItemStoreCheckboxes(it ? toArray(it.stores) : []);
  openModal('modal-tpl-item');
  setTimeout(() => document.getElementById('tpl-item-name').focus(), 50);
}
window.closeTplItemModal = function() { closeModal('modal-tpl-item'); };

function saveTplItem() {
  const name = document.getElementById('tpl-item-name').value.trim();
  if (!name) { showToast('Item name is required', 'error'); return; }
  const item = {
    name,
    qty:      document.getElementById('tpl-item-qty').value.trim(),
    unit:     document.getElementById('tpl-item-unit').value.trim(),
    category: document.getElementById('tpl-item-category').value,
    stores:   getTplItemSelectedStores(),
    tags:     document.getElementById('tpl-item-tags').value.split(',').map(s => s.trim()).filter(Boolean),
    notes:    document.getElementById('tpl-item-notes').value.trim()
  };
  if (state.tplItemEditingIdx >= 0) {
    state.tplEditorItems[state.tplItemEditingIdx] = item;
  } else {
    state.tplEditorItems.push(item);
  }
  closeModal('modal-tpl-item');
  renderTplEditorItems();
}

// ── Delete ──────────────────────────────────────────────────────────────────────────────
function confirmDelete(type, id) {
  state.pendingDelete = { type, id };
  const titles = { list:'Delete List?', category:'Delete Category?', store:'Delete Store?', template:'Delete Template?' };
  const msgs   = { list:'This will permanently delete the list and all its items.', category:'This category will be removed.', store:'This store will be removed.', template:'This template will be permanently deleted.' };
  document.getElementById('confirm-title').textContent   = titles[type];
  document.getElementById('confirm-message').textContent = msgs[type];
  openModal('modal-confirm');
}

// ── Export ───────────────────────────────────────────────────────────────────────────────
async function exportData() {
  try {
    showToast('Preparing export…', 'info');
    // Fetch all lists + their items
    const listsSnap = await getDocs(query(listsCol(), orderBy('createdAt', 'desc')));
    const lists = await Promise.all(listsSnap.docs.map(async ld => {
      const listData = { id: ld.id, ...ld.data() };
      // Convert Firestore Timestamps to ISO strings for JSON serialisation
      if (listData.createdAt?.toDate) listData.createdAt = listData.createdAt.toDate().toISOString();
      const itemsSnap = await getDocs(itemsCol(ld.id));
      listData.items = itemsSnap.docs.map(id => {
        const d = { id: id.id, ...id.data() };
        if (d.createdAt?.toDate) d.createdAt = d.createdAt.toDate().toISOString();
        if (d.updatedAt?.toDate) d.updatedAt = d.updatedAt.toDate().toISOString();
        return d;
      });
      return listData;
    }));

    const catsSnap  = await getDocs(query(categoriesCol(), orderBy('createdAt')));
    const categories = catsSnap.docs.map(d => {
      const obj = { id: d.id, ...d.data() };
      if (obj.createdAt?.toDate) obj.createdAt = obj.createdAt.toDate().toISOString();
      return obj;
    });

    const storesSnap = await getDocs(query(storesCol(), orderBy('createdAt')));
    const stores = storesSnap.docs.map(d => {
      const obj = { id: d.id, ...d.data() };
      if (obj.createdAt?.toDate) obj.createdAt = obj.createdAt.toDate().toISOString();
      return obj;
    });

    const tplsSnap  = await getDocs(query(templatesCol(), orderBy('createdAt')));
    const templates = tplsSnap.docs.map(d => {
      const obj = { id: d.id, ...d.data() };
      if (obj.createdAt?.toDate) obj.createdAt = obj.createdAt.toDate().toISOString();
      if (obj.updatedAt?.toDate) obj.updatedAt = obj.updatedAt.toDate().toISOString();
      return obj;
    });

    const payload = {
      exportedAt: new Date().toISOString(),
      version: 1,
      lists,
      categories,
      stores,
      templates
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    const date = new Date().toISOString().slice(0, 10);
    a.href     = url;
    a.download = `shoplist-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Export downloaded!', 'success');
  } catch (e) {
    showToast('Export failed: ' + e.message, 'error');
  }
}

// ── Import ───────────────────────────────────────────────────────────────────────────────
let pendingImportData = null;

function handleImportFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.lists || !data.categories || !data.stores || !data.templates) {
        showToast('Invalid backup file — missing required data.', 'error');
        return;
      }
      const listCount = data.lists.length;
      const itemCount = data.lists.reduce((sum, l) => sum + (l.items?.length || 0), 0);
      const catCount  = data.categories.length;
      const storeCount = data.stores.length;
      const tplCount  = data.templates.length;
      pendingImportData = data;
      state.pendingDelete = { type: 'import' };
      document.getElementById('confirm-title').textContent = 'Replace All Data?';
      document.getElementById('confirm-message').textContent =
        `This will permanently delete all current lists, items, categories, stores, and templates, ` +
        `then restore from the backup (${listCount} list${listCount !== 1 ? 's' : ''}, ` +
        `${itemCount} item${itemCount !== 1 ? 's' : ''}, ` +
        `${catCount} categor${catCount !== 1 ? 'ies' : 'y'}, ` +
        `${storeCount} store${storeCount !== 1 ? 's' : ''}, ` +
        `${tplCount} template${tplCount !== 1 ? 's' : ''}). This cannot be undone.`;
      document.getElementById('confirm-ok-btn').textContent = 'Replace & Import';
      openModal('modal-confirm');
    } catch {
      showToast('Could not parse file — make sure it is a valid ShopList JSON backup.', 'error');
    }
  };
  reader.readAsText(file);
}

async function performImport(data) {
  showToast('Importing… please wait.', 'info');
  try {
    // 1. Delete all existing data
    const deleteInBatches = async (snap) => {
      const BATCH_SIZE = 400;
      for (let i = 0; i < snap.docs.length; i += BATCH_SIZE) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + BATCH_SIZE).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    };

    // Delete lists + items
    const listsSnap = await getDocs(listsCol());
    for (const ld of listsSnap.docs) {
      const itemsSnap = await getDocs(itemsCol(ld.id));
      await deleteInBatches(itemsSnap);
    }
    await deleteInBatches(listsSnap);

    const catsSnap   = await getDocs(categoriesCol());
    await deleteInBatches(catsSnap);
    const storesSnap = await getDocs(storesCol());
    await deleteInBatches(storesSnap);
    const tplsSnap   = await getDocs(templatesCol());
    await deleteInBatches(tplsSnap);

    // 2. Write imported data
    const WRITE_BATCH_SIZE = 400;
    let batch = writeBatch(db);
    let opCount = 0;

    const flush = async () => { await batch.commit(); batch = writeBatch(db); opCount = 0; };
    const maybeFlush = async () => { if (++opCount >= WRITE_BATCH_SIZE) await flush(); };

    // Categories
    for (const cat of (data.categories || [])) {
      const { id, ...fields } = cat;
      fields.createdAt = serverTimestamp();
      batch.set(doc(categoriesCol(), id), fields);
      await maybeFlush();
    }

    // Stores
    for (const store of (data.stores || [])) {
      const { id, ...fields } = store;
      fields.createdAt = serverTimestamp();
      batch.set(doc(storesCol(), id), fields);
      await maybeFlush();
    }

    // Templates
    for (const tpl of (data.templates || [])) {
      const { id, ...fields } = tpl;
      fields.createdAt = serverTimestamp();
      fields.updatedAt = serverTimestamp();
      batch.set(doc(templatesCol(), id), fields);
      await maybeFlush();
    }

    // Lists + items
    for (const list of (data.lists || [])) {
      const { id: listId, items, ...listFields } = list;
      listFields.createdAt = serverTimestamp();
      batch.set(doc(listsCol(), listId), listFields);
      await maybeFlush();
      for (const item of (items || [])) {
        const { id: itemId, ...itemFields } = item;
        itemFields.createdAt = serverTimestamp();
        itemFields.updatedAt = serverTimestamp();
        batch.set(doc(itemsCol(listId), itemId), itemFields);
        await maybeFlush();
      }
    }

    await flush();
    showToast('Import complete!', 'success');
  } catch (e) {
    showToast('Import failed: ' + e.message, 'error');
  }
}

// ── About — live commit history ──────────────────────────────────────────────────────────
async function loadAboutCommits() {
  const tbody = document.getElementById('about-commits-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted);"><span class="spinner" style="margin:0 auto;"></span></td></tr>`;
  const repoUrl = 'https://github.com/dennismzanetti/shopping-list-app';
  try {
    const res = await fetch('https://api.github.com/repos/dennismzanetti/shopping-list-app/commits?per_page=50', {
      headers: { 'Accept': 'application/vnd.github+json' }
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const commits = await res.json();
    const human = commits.filter(c => {
      const login = (c.author?.login || c.committer?.login || '').toLowerCase();
      return !login.endsWith('[bot]') && login !== 'github-actions' && login !== 'dependabot';
    }).slice(0, 10);
    if (human.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted);">No commits found.</td></tr>`;
      return;
    }
    tbody.innerHTML = human.map(c => {
      const sha      = c.sha;
      const msg      = escHtml((c.commit.message || '').split('\n')[0]);
      const dateRaw  = c.commit.author?.date || c.commit.committer?.date || '';
      const dateStr  = dateRaw
        ? new Date(dateRaw).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' })
        : '—';
      const commitLink = `${repoUrl}/commit/${sha}`;
      return `<tr>
        <td class="col-date">${dateStr}</td>
        <td class="col-sha"><span class="commit-sha-pill"><a href="${commitLink}" target="_blank" rel="noopener noreferrer">${escHtml(sha)}</a></span></td>
        <td class="col-msg">${msg}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:var(--space-6);color:var(--color-error);">Could not load commits: ${escHtml(e.message)}</td></tr>`;
  }
}

// ── Modals ──────────────────────────────────────────────────────────────────────────────
window.openModal  = id => { const el = document.getElementById(id); if (el) { el.classList.add('open'); createIcons(); } };
window.closeModal = id => { const el = document.getElementById(id); if (el) el.classList.remove('open'); };

// ── Toast ──────────────────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '');
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
  toast.innerHTML = `<i data-lucide="${icon}"></i> ${msg}`;
  container.appendChild(toast);
  createIcons();
  setTimeout(() => { toast.style.animation = 'toast-out .2s ease forwards'; setTimeout(() => toast.remove(), 200); }, 3000);
}
window.showToast = showToast;

// ── Build meta ───────────────────────────────────────────────────────────────────────────
async function loadBuildMeta() {
  const el = document.getElementById('build-meta');
  if (!el) return;
  const repoUrl = 'https://github.com/dennismzanetti/shopping-list-app';
  try {
    const res = await fetch('./version.json', { cache: 'no-store' });
    if (!res.ok) throw new Error();
    const v = await res.json();
    const fullSha = v.sha || '';
    const url     = v.commitUrl || repoUrl;
    el.innerHTML  = fullSha
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${escHtml(fullSha)}</a>`
      : `<a href="${repoUrl}" target="_blank" rel="noopener noreferrer">source</a>`;
  } catch {
    el.innerHTML = `<a href="${repoUrl}" target="_blank" rel="noopener noreferrer">source</a>`;
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  syncThemeUI();

  initNav({ onSettings: loadAboutCommits });

  // Auth
  document.getElementById('google-signin-btn').addEventListener('click', async () => {
    document.getElementById('auth-body').style.display    = 'none';
    document.getElementById('auth-loading').style.display = 'flex';
    try { await signInWithPopup(auth, provider); }
    catch (e) {
      document.getElementById('auth-body').style.display    = 'block';
      document.getElementById('auth-loading').style.display = 'none';
      showToast('Sign-in failed: ' + e.message, 'error');
    }
  });

  document.getElementById('signout-btn').addEventListener('click', async () => {
    await signOut(auth); showToast('Signed out', 'info');
  });

  onAuthStateChanged(auth, user => {
    if (user) {
      state.currentUser = user;
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('app').style.display         = 'block';
      updateUserUI();
      state.pendingListId = getHashListId();
      subscribeToData();
      createIcons();
    } else {
      state.currentUser = null;
      document.getElementById('app').style.display         = 'none';
      document.getElementById('auth-screen').style.display = 'flex';
      document.getElementById('auth-body').style.display    = 'block';
      document.getElementById('auth-loading').style.display = 'none';
      teardownSubscriptions();
    }
  });

  // Theme
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('dark-mode-toggle').addEventListener('change', toggleTheme);

  // New list
  document.getElementById('new-list-btn').addEventListener('click', () => openModal('modal-new-list'));
  document.getElementById('search-lists').addEventListener('input', () => renderLists(openList, confirmDelete));
  document.getElementById('create-list-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-list-name').value.trim();
    if (!name) { showToast('Please enter a list name', 'error'); return; }
    try {
      await addDoc(listsCol(), { name, storeName: document.getElementById('new-list-store').value || '', itemCount: 0, checkedCount: 0, createdAt: serverTimestamp() });
      closeModal('modal-new-list');
      document.getElementById('new-list-name').value  = '';
      document.getElementById('new-list-store').value = '';
      showToast(`"${name}" created!`, 'success');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  });
  document.getElementById('new-list-name').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('create-list-btn').click(); });

  // List detail nav
  document.getElementById('back-to-lists').addEventListener('click', () => {
    if (state.unsubItems) { state.unsubItems(); state.unsubItems = null; }
    state.currentListId = null; setHashListId(null);
    navigateTo('lists');
    document.getElementById('header-title').textContent = 'My Lists';
  });
  document.getElementById('detail-delete-btn').addEventListener('click', () => { if (state.currentListId) confirmDelete('list', state.currentListId); });

  // Add Item button
  document.getElementById('add-item-quick-btn').addEventListener('click', () => openAddItemModal());

  // Save item (add OR edit)
  document.getElementById('save-item-btn').addEventListener('click', () =>
    _saveItem({ itemsCol, getSelectedStores })
  );
  document.getElementById('item-name-full').addEventListener('keydown', e => {
    if (e.key === 'Enter') _saveItem({ itemsCol, getSelectedStores });
  });

  // Reset state.editingItemId when modal is dismissed
  document.querySelectorAll('.modal-overlay').forEach(overlay =>
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.classList.remove('open'); state.editingItemId = null; } })
  );

  // Template editor
  document.getElementById('new-template-btn').addEventListener('click', () => openTemplateEditor(null));
  document.getElementById('tpl-add-item-btn').addEventListener('click', () => openTplItemModal(-1));
  document.getElementById('tpl-save-btn').addEventListener('click', async () => {
    const name = document.getElementById('tpl-name').value.trim();
    if (!name) { showToast('Template name is required', 'error'); return; }
    const data = {
      name,
      emoji: document.getElementById('tpl-emoji').value.trim() || '📋',
      desc:  document.getElementById('tpl-desc').value.trim(),
      items: state.tplEditorItems,
      updatedAt: serverTimestamp()
    };
    try {
      if (state.editingTemplateId) {
        await updateDoc(doc(templatesCol(), state.editingTemplateId), data);
        showToast('Template saved!', 'success');
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(templatesCol(), data);
        showToast(`"${name}" template created!`, 'success');
      }
      closeModal('modal-template-editor');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  });
  document.getElementById('tpl-delete-btn').addEventListener('click', () => {
    if (!state.editingTemplateId) return;
    state.pendingDelete = { type: 'template', id: state.editingTemplateId };
    document.getElementById('confirm-title').textContent   = 'Delete Template?';
    document.getElementById('confirm-message').textContent = 'This template will be permanently deleted.';
    closeModal('modal-template-editor');
    openModal('modal-confirm');
  });

  // Template item modal — Save button
  document.getElementById('tpl-item-save-btn').addEventListener('click', saveTplItem);
  document.getElementById('tpl-item-name').addEventListener('keydown', e => { if (e.key === 'Enter') saveTplItem(); });

  // Categories
  document.getElementById('new-category-btn').addEventListener('click', () => openModal('modal-new-category'));
  document.getElementById('save-category-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-category-name').value.trim();
    if (!name) { showToast('Category name is required', 'error'); return; }
    try {
      await addDoc(categoriesCol(), { name, emoji: document.getElementById('new-category-emoji').value.trim(), createdAt: serverTimestamp() });
      closeModal('modal-new-category');
      document.getElementById('new-category-name').value  = '';
      document.getElementById('new-category-emoji').value = '';
      showToast(`"${name}" added!`, 'success');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  });
  document.getElementById('new-category-name').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('save-category-btn').click(); });

  // Stores
  document.getElementById('new-store-btn').addEventListener('click', () => openModal('modal-new-store'));
  document.getElementById('save-store-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-store-name').value.trim();
    if (!name) { showToast('Store name is required', 'error'); return; }
    try {
      await addDoc(storesCol(), { name, createdAt: serverTimestamp() });
      closeModal('modal-new-store');
      document.getElementById('new-store-name').value = '';
      showToast(`"${name}" added!`, 'success');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  });
  document.getElementById('new-store-name').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('save-store-btn').click(); });

  // Export
  document.getElementById('export-data-btn').addEventListener('click', exportData);

  // Import
  document.getElementById('import-data-btn').addEventListener('click', () => {
    const input = document.getElementById('import-file-input');
    input.value = '';
    input.click();
  });
  document.getElementById('import-file-input').addEventListener('change', e => {
    handleImportFile(e.target.files[0]);
  });

  // Confirm dialog
  document.getElementById('confirm-ok-btn').addEventListener('click', async () => {
    if (!state.pendingDelete) return;
    const { type, id } = state.pendingDelete;
    closeModal('modal-confirm');
    // Reset confirm button label after close
    document.getElementById('confirm-ok-btn').textContent = 'Delete';
    try {
      if (type === 'import') {
        if (pendingImportData) {
          const dataToImport = pendingImportData;
          pendingImportData = null;
          await performImport(dataToImport);
        }
      } else if (type === 'list') {
        const itemSnap = await getDocs(itemsCol(id));
        const batch = writeBatch(db);
        itemSnap.docs.forEach(d => batch.delete(d.ref));
        batch.delete(doc(listsCol(), id));
        await batch.commit();
        if (state.currentListId === id) {
          if (state.unsubItems) { state.unsubItems(); state.unsubItems = null; }
          state.currentListId = null; setHashListId(null); navigateTo('lists');
          document.getElementById('header-title').textContent = 'My Lists';
        }
        showToast('List deleted', 'success');
      } else if (type === 'category') {
        await deleteDoc(doc(categoriesCol(), id));
        showToast('Category deleted', 'success');
      } else if (type === 'store') {
        await deleteDoc(doc(storesCol(), id));
        showToast('Store deleted', 'success');
      } else if (type === 'template') {
        await deleteDoc(doc(templatesCol(), id));
        showToast('Template deleted', 'success');
      }
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
    state.pendingDelete = null;
  });

  loadBuildMeta();
});

function updateUserUI() {
  const name  = state.currentUser.displayName || state.currentUser.email || 'User';
  const email = state.currentUser.email || '';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  ['sidebar-avatar','settings-avatar'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = initials; });
  const sName  = document.getElementById('sidebar-name');
  const sEmail = document.getElementById('sidebar-email');
  const stName  = document.getElementById('settings-name');
  const stEmail = document.getElementById('settings-email');
  if (sName)  sName.textContent  = name;
  if (sEmail) sEmail.textContent = email;
  if (stName)  stName.textContent  = name;
  if (stEmail) stEmail.textContent = email;
}
