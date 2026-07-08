// js/app.js — main entry point
import { auth, provider, db } from './firebase.js';
import {
  collection, doc, addDoc, setDoc, updateDoc, deleteDoc,
  onSnapshot, getDocs, writeBatch, serverTimestamp,
  query, orderBy, where
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { signInWithPopup, signOut, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';

import { state }                                        from './state.js';
import { backfillGlobalCatsStores }                     from './seed.js';
import { openModal, closeModal, showToast, openEmojiPicker,
         buildCategoryOptions, setHashListId, getHashListId,
         setUserUI, populateStorePills }                from './ui.js';
import { syncThemeUI, toggleTheme }                     from './theme.js';
import { navigateTo }                                   from './nav.js';
import { loadAboutCommits }                             from './about.js';
import { renderLists, openList, updateListCounts }      from './lists.js';
import { renderItems, openAddItemModal, openEditItemModal,
         toggleItem, saveItem, deleteItem,
         getSelectedStores, populateItemStoreCheckboxes } from './items.js';
import { renderCategories, renderStores }               from './categories.js';
import { initConfirm, confirmDelete }                   from './confirm.js';
import { initExportImport }                             from './export-import.js';
import { renderTemplates, initTemplates,
         openTemplateEditor }                           from './templates.js';
import { initVisToggle, setVisToggleValue, getVisToggleValue } from './lists-crud.js';
import { createIcons }                                  from './utils.js';
import { printList }                                    from './print.js';
import { initStoreDetail }                              from './store-detail.js';
import { initCategoryDetail }                           from './category-detail.js';

// ---------------------------------------------------------------------------
// Firestore collection helpers
// ---------------------------------------------------------------------------
const uid        = () => state.currentUser?.uid;
const listsCol   = () => collection(db, 'lists');
const itemsCol   = (listId) => collection(db, 'lists', listId, 'items');
const catsCol    = () => collection(db, 'categories');
const storesCol  = () => collection(db, 'stores');
const tplsCol    = () => collection(db, 'templates');

// Expose state and shared utilities for use in other modules
window._state = state;
window.backfillGlobalCatsStores = () => backfillGlobalCatsStores({
  db, uid: uid(),
  collection, getDocs, addDoc, query, orderBy, serverTimestamp
});
window.openEmojiPicker = openEmojiPicker;

// ---------------------------------------------------------------------------
// Shared openList options builder
// ---------------------------------------------------------------------------
function openListOpts() {
  return {
    navigateTo,
    setHashListId,
    onSnapshot,
    itemsCol,
    renderItems: doRenderItems,
    updateListCounts: (lid) => updateListCounts(lid, { listsCol, updateDoc, doc }),
    openEmojiPicker,
    updateDoc,
    doc,
    listsCol,
    showToast,
  };
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
    (id) => openList(id, openListOpts()),
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
  await updateDoc(doc(db, 'categories', catId), fields);
}

async function updateStore(storeId, fields) {
  await updateDoc(doc(db, 'stores', storeId), fields);
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
    el.addEventListener('click', async () => {
      const view = el.dataset.view;
      if (VIEW_MAP[view]) {
        // Auto-save the template if the editor is currently active
        if (typeof state._autoSaveTemplate === 'function') {
          const editorView = document.getElementById('view-template-editor');
          if (editorView && editorView.classList.contains('active')) {
            await state._autoSaveTemplate();
          }
        }
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
      const stores = Array.from(
        document.querySelectorAll('#new-list-store input[type=checkbox]:checked')
      ).map(cb => cb.value);
      try {
        const listData = {
          name,
          emoji,
          description,
          stores,
          visibility,
          ownerId: uid(),
          ownerName: state.currentUser?.displayName || state.currentUser?.email || '',
          createdAt: serverTimestamp(),
          itemCount: 0,
          checkedCount: 0
        };
        const ref = await addDoc(listsCol(), listData);
        closeModal('modal-new-list');
        openList(ref.id, openListOpts());
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
  const addBottomBtn = document.getElementById('add-item-bottom-btn');
  const saveBtn = document.getElementById('save-item-btn');
  const delBtn  = document.getElementById('delete-item-btn');

  if (addBtn)       addBtn.addEventListener('click',       () => openAddItemModal(buildCategoryOptions));
  if (addBottomBtn) addBottomBtn.addEventListener('click', () => openAddItemModal(buildCategoryOptions));
  if (saveBtn)      saveBtn.addEventListener('click',      () => saveItem({
    itemsCol,
    getSelectedStores,
    templatesCol: tplsCol,
    tplUpdateDoc: updateDoc,
    tplDoc: doc
  }));
  if (delBtn)       delBtn.addEventListener('click',       () => deleteItem({ itemsCol }));

  const cancelBtn = document.getElementById('item-modal-cancel');
  const closeBtn  = document.getElementById('item-modal-close');
  if (cancelBtn) cancelBtn.addEventListener('click', () => closeModal('modal-add-item'));
  if (closeBtn)  closeBtn.addEventListener('click',  () => closeModal('modal-add-item'));

  const nameInput = document.getElementById('item-name-full');
  if (nameInput) nameInput.addEventListener('keydown', e => { if (e.key === 'Enter') saveBtn?.click(); });
}

// ---------------------------------------------------------------------------
// Categories & Stores modals
// ---------------------------------------------------------------------------
function initCatStoreModals() {
  // ── Categories ─────────────────────────────────────────────────────────────────
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

  // ── Stores ────────────────────────────────────────────────────────────────────
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
    visToggle.addEventListener('change', async () => {
      if (!state.currentListId) return;
      const val = visToggle.value;
      try {
        await updateDoc(doc(db, 'lists', state.currentListId), { visibility: val });
      } catch (e) { showToast('Error: ' + e.message, 'error'); }
    });
  }
}

// ---------------------------------------------------------------------------
// Auth UI
// ---------------------------------------------------------------------------
function initAuth() {
  const loginBtn  = document.getElementById('google-signin-btn');
  const logoutBtn = document.getElementById('logout-btn');
  const themeBtn  = document.getElementById('theme-toggle-btn');

  if (loginBtn)  loginBtn.addEventListener('click',  () => signInWithPopup(auth, provider));
  if (logoutBtn) logoutBtn.addEventListener('click',  () => signOut(auth));
  if (themeBtn)  themeBtn.addEventListener('click',   () => toggleTheme());
}

// ---------------------------------------------------------------------------
// Main bootstrap
// ---------------------------------------------------------------------------
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    syncThemeUI();
    setUserUI(null);
    document.getElementById('app-loading')?.classList.add('hidden');
    document.getElementById('login-screen')?.classList.remove('hidden');
    document.getElementById('app-shell')?.classList.add('hidden');
    return;
  }

  state.currentUser = user;
  setUserUI(user);
  document.getElementById('app-loading')?.classList.add('hidden');
  document.getElementById('login-screen')?.classList.add('hidden');
  document.getElementById('app-shell')?.classList.remove('hidden');
  syncThemeUI();

  initNavigation();
  initNewListModal();
  initItemModal();
  initCatStoreModals();
  initListDetailNav();
  initAuth();
  initConfirm({
    db, doc, deleteDoc, collection, writeBatch,
    listsCol, itemsCol, catsCol, storesCol, tplsCol,
    navigateTo, setHashListId, showToast,
    renderLists: doRenderLists,
  });
  initExportImport({ db, collection, addDoc, getDocs, serverTimestamp, showToast, query, orderBy });
  initTemplates({
    tplsCol, addDoc, updateDoc, deleteDoc, doc,
    showToast, openModal, closeModal, navigateTo,
    buildCategoryOptions, openEmojiPicker, createIcons,
    state, confirmDelete,
  });
  initStoreDetail({ db, doc, updateDoc, deleteDoc, collection, onSnapshot, query, orderBy, showToast, navigateTo, confirmDelete, createIcons, openEmojiPicker, state });
  initCategoryDetail({ db, doc, updateDoc, deleteDoc, collection, onSnapshot, query, orderBy, showToast, navigateTo, confirmDelete, createIcons, openEmojiPicker, state });

  // Firestore listeners
  onSnapshot(
    query(listsCol(), orderBy('createdAt', 'desc')),
    snap => {
      state.allLists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      doRenderLists();
      const hashId = getHashListId();
      if (hashId && !state.currentListId) {
        openList(hashId, openListOpts());
      }
    }
  );

  onSnapshot(
    query(catsCol(), orderBy('createdAt', 'asc')),
    snap => {
      state.allCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderCategories(updateCategory, confirmDelete);
    }
  );

  onSnapshot(
    query(storesCol(), orderBy('createdAt', 'asc')),
    snap => {
      state.allStores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderStores(updateStore, confirmDelete);
    }
  );

  onSnapshot(
    query(tplsCol(), orderBy('createdAt', 'desc')),
    snap => {
      state.allTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderTemplates(state.allTemplates, confirmDelete, openTemplateEditor);
    }
  );

  navigateTo('lists');
  document.querySelectorAll('[data-view]').forEach(n =>
    n.classList.toggle('active', n.dataset.view === 'lists')
  );
});
