// js/app.js — main entry point
import { auth, provider, db } from './firebase.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, getDocs, writeBatch, serverTimestamp,
  query, orderBy
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';

import { state }                                        from './state.js';
import { openModal, closeModal, showToast }             from './ui.js';
import { syncThemeUI, toggleTheme }                     from './theme.js';
import { navigateTo }                                   from './nav.js';
import { loadAboutCommits }                             from './about.js';
import { renderLists, openList, updateListCounts }      from './lists.js';
import { renderItems, openAddItemModal, openEditItemModal,
         toggleItem, saveItem, deleteItem,
         getSelectedStores, populateItemStoreCheckboxes } from './items.js';
import { renderCategories, renderStores,
         populateStoreSelect }                          from './categories.js';
import { initConfirm, confirmDelete }                   from './confirm.js';
import { initExportImport }                             from './export-import.js';
import { renderTemplates, initTemplates,
         openTemplateEditor }                           from './templates.js';
import { createIcons }                                  from './utils.js';

// ---------------------------------------------------------------------------
// Firestore collection helpers
// ---------------------------------------------------------------------------
const uid        = () => state.currentUser?.uid;
const listsCol   = () => collection(db, 'users', uid(), 'lists');
const itemsCol   = (listId) => collection(db, 'users', uid(), 'lists', listId, 'items');
const catsCol    = () => collection(db, 'users', uid(), 'categories');
const storesCol  = () => collection(db, 'users', uid(), 'stores');
const tplsCol    = () => collection(db, 'users', uid(), 'templates');

// ---------------------------------------------------------------------------
// Category <select> helper (shared by items + templates)
// ---------------------------------------------------------------------------
function buildCategoryOptions(selected = '') {
  const blank = `<option value="">No category</option>`;
  return blank + state.allCategories.map(c =>
    `<option value="${c.name}" ${c.name === selected ? 'selected' : ''}>${(c.emoji ? c.emoji + ' ' : '') + c.name}</option>`
  ).join('');
}

// ---------------------------------------------------------------------------
// Hash-based list routing  (#list-<id>)
// ---------------------------------------------------------------------------
function setHashListId(id) {
  history.replaceState(null, '', id ? `#list-${id}` : window.location.pathname);
}

function getHashListId() {
  const m = window.location.hash.match(/^#list-(.+)$/);
  return m ? m[1] : null;
}

// ---------------------------------------------------------------------------
// Render helpers (called after each Firestore snapshot)
// ---------------------------------------------------------------------------
function doRenderItems() {
  const catSel = document.getElementById('item-category');
  if (catSel) catSel.innerHTML = buildCategoryOptions(
    state.editingItemId
      ? (state.allItems.find(i => i.id === state.editingItemId)?.category || '')
      : ''
  );
  renderItems(
    (id) => toggleItem(id, { itemsCol }),
    (id) => openEditItemModal(id, buildCategoryOptions),
    (id) => confirmDelete('item', id)
  );
}

function doRenderLists() {
  renderLists(
    (id) => openList(id, {
      navigateTo,
      setHashListId,
      onSnapshot,
      itemsCol,
      renderItems: doRenderItems,
      updateListCounts: (lid) => updateListCounts(lid, { listsCol, updateDoc, doc })
    }),
    (type, id) => confirmDelete(type, id)
  );
  // Update badges
  const count = state.allLists.length;
  ['badge-lists', 'header-badge-lists'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  });
  populateStoreSelect(state.allStores);
}

// ---------------------------------------------------------------------------
// Navigation — wire both sidebar nav-items and header nav-items
// ---------------------------------------------------------------------------
function initNavigation() {
  const VIEW_MAP = {
    lists:      'lists',
    templates:  'templates',
    categories: 'categories',
    stores:     'stores',
    settings:   'settings'
  };

  document.querySelectorAll('[data-view]').forEach(el => {
    el.addEventListener('click', () => {
      const view = el.dataset.view;
      if (VIEW_MAP[view]) {
        navigateTo(view);
        document.querySelectorAll('[data-view]').forEach(n => {
          n.classList.toggle('active', n.dataset.view === view);
        });
        if (view === 'settings') loadAboutCommits();
      }
    });
  });

  // Mobile sidebar backdrop + toggle (safe no-ops if elements removed)
  const backdrop   = document.getElementById('sidebar-backdrop');
  const sidebar    = document.getElementById('sidebar');
  const menuBtn    = document.getElementById('mobile-menu-btn');
  if (menuBtn && sidebar) {
    menuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (backdrop) backdrop.classList.toggle('open');
    });
  }
  if (backdrop && sidebar) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    });
  }
}

// ---------------------------------------------------------------------------
// New-list modal
// ---------------------------------------------------------------------------
function initNewListModal() {
  const btn      = document.getElementById('new-list-btn');
  const emptyBtn = document.getElementById('empty-new-list-btn');
  const createBtn = document.getElementById('create-list-btn');
  const nameInput = document.getElementById('new-list-name');
  const storeSelect = document.getElementById('new-list-store');

  const open = () => {
    populateStoreSelect(state.allStores);
    if (nameInput) nameInput.value = '';
    openModal('modal-new-list');
    setTimeout(() => nameInput?.focus(), 50);
  };

  if (btn)      btn.addEventListener('click', open);
  if (emptyBtn) emptyBtn.addEventListener('click', open);

  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const name = nameInput?.value.trim();
      if (!name) { showToast('List name is required', 'error'); return; }
      try {
        const ref = await addDoc(listsCol(), {
          name,
          store: storeSelect?.value || '',
          createdAt: serverTimestamp(),
          itemCount: 0,
          checkedCount: 0
        });
        closeModal('modal-new-list');
        openList(ref.id, {
          navigateTo,
          setHashListId,
          onSnapshot,
          itemsCol,
          renderItems: doRenderItems,
          updateListCounts: (lid) => updateListCounts(lid, { listsCol, updateDoc, doc })
        });
      } catch (e) { showToast('Error: ' + e.message, 'error'); }
    });
  }

  if (nameInput) {
    nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') createBtn?.click(); });
  }
}

// ---------------------------------------------------------------------------
// Item modal buttons
// ---------------------------------------------------------------------------
function initItemModal() {
  const addBtn  = document.getElementById('add-item-quick-btn');
  const saveBtn = document.getElementById('save-item-btn');
  const delBtn  = document.getElementById('delete-item-btn');

  if (addBtn)  addBtn.addEventListener('click',  () => openAddItemModal(buildCategoryOptions));
  if (saveBtn) saveBtn.addEventListener('click', () => saveItem({ itemsCol, getSelectedStores }));
  if (delBtn)  delBtn.addEventListener('click',  () => deleteItem({ itemsCol }));

  const nameInput = document.getElementById('item-name-full');
  if (nameInput) nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveBtn?.click(); });
}

// ---------------------------------------------------------------------------
// Categories & Stores (new-item modals)
// ---------------------------------------------------------------------------
function initCatStoreModals() {
  const newCatBtn  = document.getElementById('new-category-btn');
  const saveCatBtn = document.getElementById('save-category-btn');
  const catNameIn  = document.getElementById('new-category-name');
  const catEmojiIn = document.getElementById('new-category-emoji');

  if (newCatBtn) newCatBtn.addEventListener('click', () => {
    if (catNameIn)  catNameIn.value  = '';
    if (catEmojiIn) catEmojiIn.value = '';
    const emojiBtn = document.getElementById('cat-emoji-btn');
    if (emojiBtn) emojiBtn.textContent = '🏷️';
    openModal('modal-new-category');
    setTimeout(() => catNameIn?.focus(), 50);
  });

  if (saveCatBtn) saveCatBtn.addEventListener('click', async () => {
    const name = catNameIn?.value.trim();
    if (!name) { showToast('Category name is required', 'error'); return; }
    const exists = state.allCategories.some(c => c.name.toLowerCase() === name.toLowerCase());
    if (exists) { showToast('Category already exists', 'error'); return; }
    try {
      await addDoc(catsCol(), { name, emoji: catEmojiIn?.value.trim() || '', createdAt: serverTimestamp() });
      closeModal('modal-new-category');
      showToast('Category added', 'success');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  });
  if (catNameIn) catNameIn.addEventListener('keydown', e => { if (e.key === 'Enter') saveCatBtn?.click(); });

  const catEmojiBtn     = document.getElementById('cat-emoji-btn');
  const catEmojiPopover = document.getElementById('cat-emoji-picker-popover');
  if (catEmojiBtn && catEmojiPopover) {
    catEmojiBtn.addEventListener('click', e => {
      e.stopPropagation();
      catEmojiPopover.classList.toggle('open');
    });
    catEmojiPopover.querySelectorAll('.emoji-option').forEach(opt => {
      opt.addEventListener('click', () => {
        if (catEmojiIn) catEmojiIn.value = opt.dataset.emoji;
        catEmojiBtn.textContent = opt.dataset.emoji;
        catEmojiPopover.classList.remove('open');
      });
    });
    document.addEventListener('click', e => {
      if (!catEmojiBtn.contains(e.target) && !catEmojiPopover.contains(e.target))
        catEmojiPopover.classList.remove('open');
    });
  }

  const newStoreBtn  = document.getElementById('new-store-btn');
  const saveStoreBtn = document.getElementById('save-store-btn');
  const storeNameIn  = document.getElementById('new-store-name');

  if (newStoreBtn) newStoreBtn.addEventListener('click', () => {
    if (storeNameIn) storeNameIn.value = '';
    openModal('modal-new-store');
    setTimeout(() => storeNameIn?.focus(), 50);
  });

  if (saveStoreBtn) saveStoreBtn.addEventListener('click', async () => {
    const name = storeNameIn?.value.trim();
    if (!name) { showToast('Store name is required', 'error'); return; }
    const exists = state.allStores.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (exists) { showToast('Store already exists', 'error'); return; }
    try {
      await addDoc(storesCol(), { name, createdAt: serverTimestamp() });
      closeModal('modal-new-store');
      showToast('Store added', 'success');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  });
  if (storeNameIn) storeNameIn.addEventListener('keydown', e => { if (e.key === 'Enter') saveStoreBtn?.click(); });
}

// ---------------------------------------------------------------------------
// Back button on list detail view
// ---------------------------------------------------------------------------
function initListDetailNav() {
  const backBtn   = document.getElementById('back-to-lists');
  const deleteBtn = document.getElementById('detail-delete-btn');

  if (backBtn) backBtn.addEventListener('click', () => {
    if (state.unsubItems) { state.unsubItems(); state.unsubItems = null; }
    state.currentListId = null;
    setHashListId(null);
    navigateTo('lists');
    document.querySelectorAll('[data-view]').forEach(n =>
      n.classList.toggle('active', n.dataset.view === 'lists')
    );
  });

  if (deleteBtn) deleteBtn.addEventListener('click', () => {
    if (!state.currentListId) return;
    confirmDelete('list', state.currentListId);
  });
}

// ---------------------------------------------------------------------------
// Firestore real-time subscriptions (start after sign-in)
// ---------------------------------------------------------------------------
function startListeners() {
  state.unsubLists = onSnapshot(
    query(listsCol(), orderBy('createdAt')),
    snap => {
      state.allLists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      doRenderLists();
      if (state.listsFirstLoad) {
        state.listsFirstLoad = false;
        const hashId = getHashListId();
        if (hashId && state.allLists.find(l => l.id === hashId)) {
          openList(hashId, {
            navigateTo, setHashListId, onSnapshot, itemsCol,
            renderItems: doRenderItems,
            updateListCounts: (lid) => updateListCounts(lid, { listsCol, updateDoc, doc })
          });
        }
      }
    },
    err => { if (err.code !== 'permission-denied') console.error('lists:', err); }
  );

  state.unsubCategories = onSnapshot(
    query(catsCol(), orderBy('createdAt')),
    snap => {
      state.allCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderCategories(state.allCategories, confirmDelete);
    },
    err => { if (err.code !== 'permission-denied') console.error('categories:', err); }
  );

  state.unsubStores = onSnapshot(
    query(storesCol(), orderBy('createdAt')),
    snap => {
      state.allStores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderStores(state.allStores, confirmDelete);
      populateStoreSelect(state.allStores);
    },
    err => { if (err.code !== 'permission-denied') console.error('stores:', err); }
  );

  state.unsubTemplates = onSnapshot(
    query(tplsCol(), orderBy('createdAt')),
    snap => {
      state.allTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderTemplates((id) => openTemplateEditor(id, { buildCategoryOptions }));
    },
    err => { if (err.code !== 'permission-denied') console.error('templates:', err); }
  );
}

function stopListeners() {
  ['unsubLists','unsubItems','unsubCategories','unsubStores','unsubTemplates'].forEach(k => {
    if (state[k]) { state[k](); state[k] = null; }
  });
}

// ---------------------------------------------------------------------------
// Auth UI helpers
// ---------------------------------------------------------------------------
function setUserUI(user) {
  const initial = (user.displayName || user.email || 'U')[0].toUpperCase();
  ['header-avatar','settings-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (user.photoURL) {
        el.innerHTML = `<img src="${user.photoURL}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      } else {
        el.textContent = initial;
      }
    }
  });
  const nameEl  = document.getElementById('settings-name');
  const emailEl = document.getElementById('settings-email');
  if (nameEl)  nameEl.textContent  = user.displayName || '—';
  if (emailEl) emailEl.textContent = user.email || '—';
}

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------
function init() {
  state.currentTheme = document.documentElement.getAttribute('data-theme') ||
    (matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light');
  syncThemeUI();
  document.getElementById('theme-toggle')?.addEventListener('click', toggleTheme);
  document.getElementById('dark-mode-toggle')?.addEventListener('change', toggleTheme);

  initNavigation();
  initNewListModal();
  initItemModal();
  initCatStoreModals();
  initListDetailNav();

  initConfirm({
    db, listsCol, itemsCol,
    categoriesCol: catsCol,
    storesCol,
    templatesCol: tplsCol,
    getDocs, writeBatch, doc, serverTimestamp, deleteDoc,
    setHashListId
  });

  initExportImport({
    db, listsCol, itemsCol,
    categoriesCol: catsCol,
    storesCol,
    templatesCol: tplsCol,
    getDocs, writeBatch, doc, addDoc, serverTimestamp, query, orderBy
  });

  initTemplates({
    templatesCol: tplsCol, addDoc, updateDoc, deleteDoc, doc, serverTimestamp,
    buildCategoryOptions, confirmDelete,
    listsCol, itemsCol, writeBatch, db
  });

  document.getElementById('signout-btn')?.addEventListener('click', async () => {
    stopListeners();
    await signOut(auth);
  });

  document.getElementById('google-signin-btn')?.addEventListener('click', async () => {
    const authLoading = document.getElementById('auth-loading');
    const authBody    = document.getElementById('auth-body');
    if (authLoading) authLoading.style.display = 'flex';
    if (authBody)    authBody.style.display    = 'none';
    try {
      await signInWithPopup(auth, provider);
    } catch (e) {
      if (authLoading) authLoading.style.display = 'none';
      if (authBody)    authBody.style.display    = '';
      if (e.code !== 'auth/popup-closed-by-user') showToast('Sign-in failed: ' + e.message, 'error');
    }
  });

  onAuthStateChanged(auth, user => {
    const authScreen = document.getElementById('auth-screen');
    const appEl      = document.getElementById('app');

    if (user) {
      state.currentUser    = user;
      state.listsFirstLoad = true;
      if (authScreen) authScreen.style.display = 'none';
      if (appEl)      appEl.style.display      = '';
      setUserUI(user);
      startListeners();
      navigateTo('lists');
      createIcons();
    } else {
      stopListeners();
      state.currentUser   = null;
      state.currentListId = null;
      state.allLists      = [];
      state.allItems      = [];
      state.allCategories = [];
      state.allStores     = [];
      state.allTemplates  = [];
      if (authScreen) authScreen.style.display = '';
      if (appEl)      appEl.style.display      = 'none';
      createIcons();
    }
  });
}

init();
