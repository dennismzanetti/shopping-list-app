// lists-crud.js - wires New List modal, list detail header, and item action buttons
import { state } from './state.js';
import { escHtml, createIcons } from './utils.js';

/** Returns the currently selected value from a .vis-toggle group */
export function getVisToggleValue(groupId) {
  const btn = document.querySelector(`#${groupId} .vis-toggle-btn.active`);
  return btn ? btn.dataset.value : 'private';
}

/** Wire up click handlers for a .vis-toggle group */
export function initVisToggle(groupId) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('.vis-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      group.querySelectorAll('.vis-toggle-btn').forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-pressed', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    });
  });
}

/** Set a .vis-toggle group to a specific value */
export function setVisToggleValue(groupId, value) {
  const group = document.getElementById(groupId);
  if (!group) return;
  group.querySelectorAll('.vis-toggle-btn').forEach(btn => {
    const isActive = btn.dataset.value === value;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

export function initNewList({ listsCol, addDoc, serverTimestamp, openList, confirmDelete }) {
  // Wire vis-toggle
  initVisToggle('new-list-visibility');

  const newListBtn  = document.getElementById('new-list-btn');
  const emptyBtn    = document.getElementById('empty-new-list-btn');
  const createBtn   = document.getElementById('create-list-btn');

  const openModal = () => {
    document.getElementById('new-list-name').value = '';
    setVisToggleValue('new-list-visibility', 'private');
    window.openModal('modal-new-list');
    setTimeout(() => document.getElementById('new-list-name').focus(), 50);
  };
  if (newListBtn) newListBtn.addEventListener('click', openModal);
  if (emptyBtn)   emptyBtn.addEventListener('click', openModal);

  if (createBtn) createBtn.addEventListener('click', async () => {
    const name = document.getElementById('new-list-name').value.trim();
    if (!name) { window.showToast('List name is required', 'error'); return; }
    const storeEl = document.getElementById('new-list-store');
    const store   = storeEl ? storeEl.value : '';
    const visibility = getVisToggleValue('new-list-visibility');
    try {
      const ref = await addDoc(listsCol(), {
        name,
        store,
        visibility,
        createdAt: serverTimestamp(),
        itemCount: 0,
        checkedCount: 0
      });
      window.closeModal('modal-new-list');
      openList(ref.id);
    } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
  });

  document.getElementById('new-list-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('create-list-btn').click();
  });
}

export function initListDetail({ confirmDelete, navigateTo, setHashListId }) {
  const backBtn = document.getElementById('back-to-lists');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      state.currentListId = null;
      setHashListId(null);
      navigateTo('lists');
    });
  }

  const deleteBtn = document.getElementById('detail-delete-btn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', () => {
      if (!state.currentListId) return;
      confirmDelete('list', state.currentListId, () => {
        state.currentListId = null;
        setHashListId(null);
        navigateTo('lists');
      });
    });
  }
}

export function initItemButtons({ openAddItemModal, saveItem, itemsCol, getSelectedStores }) {
  const addBtn = document.getElementById('add-item-btn');
  if (addBtn) addBtn.addEventListener('click', () => openAddItemModal());

  const saveBtn = document.getElementById('save-item-btn');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveItem({ itemsCol, getSelectedStores });
    });
  }
}
