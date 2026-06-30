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
import { loadAboutCommits, loadBuildMeta } from './js/about.js';
import { renderTemplates, openTemplateEditor, initTemplates } from './js/templates.js';
import { initExportImport, performImport, getAndClearPendingImport } from './js/export-import.js';
import { initCategoriesStores } from './js/categories-stores.js';

// ── Hash-based list restore ──────────────────────────────────────────────────
function getHashListId() {
  const m = window.location.hash.match(/^#list\/(.+)$/);
  return m ? m[1] : null;
}
function setHashListId(listId) {
  history.replaceState(null, '', listId ? `#list/${listId}` : '#');
}

// ── Firestore Helpers ────────────────────────────────────────────────────────
const uid           = () => state.currentUser.uid;
const listsCol      = () => collection(db, 'users', uid(), 'lists');
const itemsCol      = listId => collection(db, 'users', uid(), 'lists', listId, 'items');
const categoriesCol = () => collection(db, 'users', uid(), 'categories');
const storesCol     = () => collection(db, 'users', uid(), 'stores');
const templatesCol  = () => collection(db, 'users', uid(), 'templates');

const firestoreDeps = () => ({ db, listsCol, itemsCol, categoriesCol, storesCol, templatesCol, getDocs, query, orderBy, writeBatch, doc, serverTimestamp });

// ── Local wrappers ───────────────────────────────────────────────────────────
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
  if (state.unsubLists)      { state.unsubLists();      state.unsubLists      = null; }
  if (state.unsubItems)      { state.unsubItems();      state.unsubItems      = null; }
  if (state.unsubCategories) { state.unsubCategories(); state.unsubCategories = null; }
  if (state.unsubStores)     { state.unsubStores();     state.unsubStores     = null; }
  if (state.unsubTemplates)  { state.unsubTemplates();  state.unsubTemplates  = null; }
  state.allLists = []; state.allItems = []; state.allCategories = [];
  state.allStores = []; state.allTemplates = [];
}

function subscribeToData() {
  state.listsFirstLoad = true;
  seedDefaultsIfNeeded(state.currentUser);
  seedTemplatesIfNeeded(state.currentUser);

  state.unsubTemplates = onSnapshot(query(templatesCol(), orderBy('createdAt')), snap => {
    state.allTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTemplates(tplId => openTemplateEditor(tplId, { buildCategoryOptions }));
  });

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

// ── Category Selects ─────────────────────────────────────────────────────────
function buildCategoryOptions(selectedCategory = '') {
  const blank = `<option value="">-- No category --</option>`;
  const opts  = state.allCategories.map(c =>
    `<option value="${escHtml(c.name)}" ${c.name === selectedCategory ? 'selected' : ''}>${c.emoji ? c.emoji + ' ' : ''}${escHtml(c.name)}</option>`
  ).join('');
  return blank + opts;
}

function populateCategorySelects() {
  const itemSel = document.getElementById('item-category');
  const tplSel  = document.getElementById('tpl-item-category');
  if (itemSel) itemSel.innerHTML = buildCategoryOptions();
  if (tplSel)  tplSel.innerHTML  = buildCategoryOptions();
}

// ── Delete ───────────────────────────────────────────────────────────────────
function confirmDelete(type, id) {
  state.pendingDelete = { type, id };
  const titles = { list:'Delete List?', category:'Delete Category?', store:'Delete Store?', template:'Delete Template?' };
  const msgs   = { list:'This will permanently delete the list and all its items.', category:'This category will be removed.', store:'This store will be removed.', template:'This template will be permanently deleted.' };
  document.getElementById('confirm-title').textContent   = titles[type];
  document.getElementById('confirm-message').textContent = msgs[type];
  window.openModal('modal-confirm');
}

// ── Modals ───────────────────────────────────────────────────────────────────
window.openModal  = id => { const el = document.getElementById(id); if (el) { el.classList.add('open');    createIcons(); } };
window.closeModal = id => { const el = document.getElementById(id); if (el)   el.classList.remove('open'); };

// ── Toast ────────────────────────────────────────────────────────────────────
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

// ── Bootstrap ────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  syncThemeUI();
  initNav({ onSettings: loadAboutCommits });
  initTemplates({ templatesCol, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, buildCategoryOptions, confirmDelete });
  initExportImport(firestoreDeps());
  initCategoriesStores({ categoriesCol, storesCol, addDoc, serverTimestamp });

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
  document.getElementById('new-list-btn').addEventListener('click', () => window.openModal('modal-new-list'));
  document.getElementById('search-lists').addEventListener('input', () => renderLists(openList, confirmDelete));
  document.getElementById('create-list-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-list-name').value.trim();
    if (!name) { showToast('Please enter a list name', 'error'); return; }
    try {
      await addDoc(listsCol(), { name, storeName: document.getElementById('new-list-store').value || '', itemCount: 0, checkedCount: 0, createdAt: serverTimestamp() });
      window.closeModal('modal-new-list');
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

  // Add / Save item
  document.getElementById('add-item-quick-btn').addEventListener('click', () => openAddItemModal());
  document.getElementById('save-item-btn').addEventListener('click', () => _saveItem({ itemsCol, getSelectedStores }));
  document.getElementById('item-name-full').addEventListener('keydown', e => { if (e.key === 'Enter') _saveItem({ itemsCol, getSelectedStores }); });

  // Dismiss modals
  document.querySelectorAll('.modal-overlay').forEach(overlay =>
    overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.classList.remove('open'); state.editingItemId = null; } })
  );

  // Confirm dialog
  document.getElementById('confirm-ok-btn').addEventListener('click', async () => {
    if (!state.pendingDelete) return;
    const { type, id } = state.pendingDelete;
    window.closeModal('modal-confirm');
    document.getElementById('confirm-ok-btn').textContent = 'Delete';
    try {
      if (type === 'import') {
        const data = getAndClearPendingImport();
        if (data) await performImport(data, firestoreDeps());
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
        await deleteDoc(doc(categoriesCol(), id)); showToast('Category deleted', 'success');
      } else if (type === 'store') {
        await deleteDoc(doc(storesCol(), id)); showToast('Store deleted', 'success');
      } else if (type === 'template') {
        await deleteDoc(doc(templatesCol(), id)); showToast('Template deleted', 'success');
      }
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
    state.pendingDelete = null;
  });

  loadBuildMeta();
});

function updateUserUI() {
  const name     = state.currentUser.displayName || state.currentUser.email || 'User';
  const email    = state.currentUser.email || '';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  ['sidebar-avatar','settings-avatar'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = initials; });
  ['sidebar-name','settings-name'].forEach(id   => { const el = document.getElementById(id); if (el) el.textContent = name;  });
  ['sidebar-email','settings-email'].forEach(id  => { const el = document.getElementById(id); if (el) el.textContent = email; });
}
