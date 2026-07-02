// js/app.js — main entry point
import { auth, provider, db } from './firebase.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, getDocs, writeBatch, serverTimestamp,
  query, orderBy
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';

import { state }                                        from './state.js';
import { openModal, closeModal, showToast, openEmojiPicker } from './ui.js';
import { syncThemeUI, toggleTheme }                     from './theme.js';
import { navigateTo }                                   from './nav.js';
import { loadAboutCommits }                             from './about.js';
import { renderLists, openList, updateListCounts }      from './lists.js';
import { renderItems, openAddItemModal, openEditItemModal,
         toggleItem, saveItem, deleteItem,
         getSelectedStores, populateItemStoreCheckboxes } from './items.js';
import { renderCategories, renderStores,
         populateStorePills }                           from './categories.js';
import { initConfirm, confirmDelete }                   from './confirm.js';
import { initExportImport }                             from './export-import.js';
import { renderTemplates, initTemplates,
         openTemplateEditor }                           from './templates.js';
import { initVisToggle, setVisToggleValue, getVisToggleValue } from './lists-crud.js';
import { createIcons }                                  from './utils.js';
import { printList }                                    from './print.js';

// ---------------------------------------------------------------------------
// Firestore collection helpers
// ---------------------------------------------------------------------------
const uid        = () => state.currentUser?.uid;
const listsCol   = () => collection(db, 'users', uid(), 'lists');
const itemsCol   = (listId) => collection(db, 'users', uid(), 'lists', listId, 'items');
const catsCol    = () => collection(db, 'users', uid(), 'categories');
const storesCol  = () => collection(db, 'users', uid(), 'stores');
const tplsCol    = () => collection(db, 'users', uid(), 'templates');

// Expose state for duplicate-check in inline edit
window._state = state;

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
      updateListCounts: (lid) => updateListCounts(lid, { listsCol, updateDoc, doc }),
      openEmojiPicker,
    }),
    (type, id) => confirmDelete(type, id)
  );
  // Update badges
  const count = state.allLists.length;
  ['badge-lists', 'header-badge-lists'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = count;
  });
  // Refresh store pills in the new-list modal if it's already open
  populateStorePills('new-list-store', state.allStores);
}

// ---------------------------------------------------------------------------
// Category / Store update helpers
// ---------------------------------------------------------------------------
async function updateCategory(catId, fields) {
  await updateDoc(doc(db, 'users', uid(), 'categories', catId), fields);
}

async function updateStore(storeId, fields) {
  await updateDoc(doc(db, 'users', uid(), 'stores', storeId), fields);
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
  const btn       = document.getElementById('new-list-btn');
  const emptyBtn  = document.getElementById('empty-new-list-btn');
  const createBtn = document.getElementById('create-list-btn');
  const cancelBtn = document.getElementById('list-modal-cancel');
  const closeBtn  = document.getElementById('list-modal-close');
  const nameInput = document.getElementById('new-list-name');
  const descInput = document.getElementById('new-list-description');
  const emojiBtn  = document.getElementById('emoji-picker-btn');
  const emojiInput = document.getElementById('list-emoji-input');

  initVisToggle('new-list-visibility');

  const resetModal = () => {
    if (nameInput)  nameInput.value  = '';
    if (descInput)  descInput.value  = '';
    if (emojiInput) emojiInput.value = '';
    if (emojiBtn)   emojiBtn.textContent = '🛒';
    setVisToggleValue('new-list-visibility', 'private');
    // Uncheck all store pills
    document.querySelectorAll('#new-list-store input[type=checkbox]').forEach(cb => cb.checked = false);
    const labels = document.querySelectorAll('#new-list-store .store-checkbox-label');
    labels.forEach(l => l.classList.remove('selected'));
  };

  const open = () => {
    populateStorePills('new-list-store', state.allStores);
    resetModal();
    openModal('modal-new-list');
    setTimeout(() => { nameInput?.focus(); createIcons(); }, 50);
  };

  if (btn)       btn.addEventListener('click', open);
  if (emptyBtn)  emptyBtn.addEventListener('click', open);
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal('modal-new-list'));
  if (closeBtn)  closeBtn.addEventListener('click',  () => closeModal('modal-new-list'));

  // Emoji picker button — shows the full-screen emoji picker overlay
  if (emojiBtn) {
    emojiBtn.addEventListener('click', () =>
      openEmojiPicker('list-emoji-input', 'emoji-picker-btn')
    );
  }

  if (createBtn) {
    createBtn.addEventListener('click', async () => {
      const name = nameInput?.value.trim();
      if (!name) { showToast('List name is required', 'error'); return; }
      const visibility = getVisToggleValue('new-list-visibility');
      const emoji = emojiInput?.value.trim() || '';
      const description = descInput?.value.trim() || '';
      // Collect checked store pills
      const stores = Array.from(
        document.querySelectorAll('#new-list-store input[type=checkbox]:checked')
      ).map(cb => cb.value);
      try {
        const ref = await addDoc(listsCol(), {
          name,
          emoji,
          description,
          stores,
          visibility,
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
          updateListCounts: (lid) => updateListCounts(lid, { listsCol, updateDoc, doc }),
          openEmojiPicker,
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
// Categories & Stores modals
// ---------------------------------------------------------------------------
function initCatStoreModals() {
  // ── Categories ──────────────────────────────────────────────────────────
  const newCatBtn  = document.getElementById('new-category-btn');
  const saveCatBtn = document.getElementById('save-category-btn');
  const cancelCatBtn = document.getElementById('category-modal-cancel');
  const closeCatBtn  = document.getElementById('category-modal-close');
  const catNameIn  = document.getElementById('new-category-name');
  const catEmojiIn = document.getElementById('new-category-emoji');
  const catEmojiPickerBtn = document.getElementById('category-emoji-picker-btn');

  if (newCatBtn) newCatBtn.addEventListener('click', () => {
    if (catNameIn)  catNameIn.value  = '';
    if (catEmojiIn) catEmojiIn.value = '';
    if (catEmojiPickerBtn) catEmojiPickerBtn.innerHTML = '<i data-lucide="smile"></i> Pick';
    openModal('modal-new-category');
    setTimeout(() => { catNameIn?.focus(); createIcons(); }, 50);
  });
  if (cancelCatBtn) cancelCatBtn.addEventListener('click', () => closeModal('modal-new-category'));
  if (closeCatBtn)  closeCatBtn.addEventListener('click',  () => closeModal('modal-new-category'));

  if (catEmojiPickerBtn) {
    catEmojiPickerBtn.addEventListener('click', () =>
      openEmojiPicker('new-category-emoji', 'category-emoji-picker-btn')
    );
  }

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

  // ── Stores ───────────────────────────────────────────────────────────────
  const newStoreBtn      = document.getElementById('new-store-btn');
  const saveStoreBtn     = document.getElementById('save-store-btn');
  const cancelStoreBtn   = document.getElementById('store-modal-cancel');
  const closeStoreBtn    = document.getElementById('store-modal-close');
  const storeNameIn      = document.getElementById('new-store-name');
  const storeEmojiIn     = document.getElementById('store-emoji-input');
  const storeEmojiPickerBtn = document.getElementById('store-emoji-picker-btn');

  if (newStoreBtn) newStoreBtn.addEventListener('click', () => {
    if (storeNameIn)  storeNameIn.value  = '';
    if (storeEmojiIn) storeEmojiIn.value = '';
    if (storeEmojiPickerBtn) storeEmojiPickerBtn.innerHTML = '<i data-lucide="smile"></i> Pick';
    openModal('modal-new-store');
    setTimeout(() => { storeNameIn?.focus(); createIcons(); }, 50);
  });
  if (cancelStoreBtn) cancelStoreBtn.addEventListener('click', () => closeModal('modal-new-store'));
  if (closeStoreBtn)  closeStoreBtn.addEventListener('click',  () => closeModal('modal-new-store'));

  if (storeEmojiPickerBtn) {
    storeEmojiPickerBtn.addEventListener('click', () =>
      openEmojiPicker('store-emoji-input', 'store-emoji-picker-btn')
    );
  }

  if (saveStoreBtn) saveStoreBtn.addEventListener('click', async () => {
    const name = storeNameIn?.value.trim();
    if (!name) { showToast('Store name is required', 'error'); return; }
    const exists = state.allStores.some(s => s.name.toLowerCase() === name.toLowerCase());
    if (exists) { showToast('Store already exists', 'error'); return; }
    const emoji = storeEmojiIn?.value.trim() || '';
    try {
      await addDoc(storesCol(), { name, emoji, createdAt: serverTimestamp() });
      closeModal('modal-new-store');
      showToast('Store added', 'success');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  });
  if (storeNameIn) storeNameIn.addEventListener('keydown', e => { if (e.key === 'Enter') saveStoreBtn?.click(); });
}

// ---------------------------------------------------------------------------
// Back button + delete + visibility toggle on list detail view
// ---------------------------------------------------------------------------
function initListDetailNav() {
  const backBtn   = document.getElementById('back-to-lists');
  const deleteBtn = document.getElementById('detail-delete-btn');
  const printBtn  = document.getElementById('print-list-btn');
  const visToggle = document.getElementById('detail-visibility-toggle');

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

  if (printBtn) printBtn.addEventListener('click', () => printList());

  if (visToggle) {
    visToggle.querySelectorAll('.vis-toggle-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!state.currentListId) return;
        const newVis = btn.dataset.value;
        visToggle.querySelectorAll('.vis-toggle-btn').forEach(b => {
          b.classList.toggle('active', b === btn);
          b.setAttribute('aria-pressed', String(b === btn));
        });
        try {
          await updateDoc(doc(listsCol(), state.currentListId), { visibility: newVis });
          showToast(
            newVis === 'public' ? 'List set to Public' : 'List set to Private',
            'success'
          );
        } catch (e) {
          showToast('Error: ' + e.message, 'error');
        }
      });
    });
  }
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
            updateListCounts: (lid) => updateListCounts(lid, { listsCol, updateDoc, doc }),
            openEmojiPicker,
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
      renderCategories(state.allCategories, confirmDelete, updateCategory);
    },
    err => { if (err.code !== 'permission-denied') console.error('categories:', err); }
  );

  state.unsubStores = onSnapshot(
    query(storesCol(), orderBy('createdAt')),
    snap => {
      state.allStores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderStores(state.allStores, confirmDelete, updateStore);
      populateStorePills('new-list-store', state.allStores);
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
  if (nameEl)  nameEl.textContent  = user.displayName || '\u2014';
  if (emailEl) emailEl.textContent = user.email || '\u2014';
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
