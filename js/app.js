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
         setUserUI }                                    from './ui.js';
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
    if (emojiBtn)   emojiBtn.textContent = '\uD83D\uDED2';
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
          itemCount