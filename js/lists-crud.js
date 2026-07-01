// lists-crud.js — wires New List modal, list detail header, and item action buttons
import { state } from './state.js';
import { createIcons } from './utils.js';
import {
  saveItem as _saveItem,
  deleteItem as _deleteItem,
  getSelectedStores
} from './items.js';

export function initNewList({ listsCol, addDoc, serverTimestamp, openList, confirmDelete }) {
  const newListBtn  = document.getElementById('new-list-btn');
  const emptyBtn    = document.getElementById('empty-new-list-btn');
  const createBtn   = document.getElementById('create-list-btn');

  const openModal = () => {
    document.getElementById('new-list-name').value = '';
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
    try {
      const ref = await addDoc(listsCol(), {
        name,
        store,
        visibility: 'private',
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
  document.getElementById('back-to-lists').addEventListener('click', () => {
    state.currentListId = null;
    setHashListId(null);
    navigateTo('lists');
  });
  document.getElementById('detail-delete-btn').addEventListener('click', () => {
    if (state.currentListId) confirmDelete('list', state.currentListId);
  });
}

export function initItemButtons({ openAddItemModal, saveItem, itemsCol, getSelectedStores }) {
  document.getElementById('add-item-quick-btn').addEventListener('click', () => openAddItemModal());
  document.getElementById('save-item-btn').addEventListener('click', () =>
    _saveItem({ itemsCol, getSelectedStores })
  );
  document.getElementById('delete-item-btn').addEventListener('click', () =>
    _deleteItem({ itemsCol })
  );
  document.getElementById('item-name-full').addEventListener('keydown', e => {
    if (e.key === 'Enter') _saveItem({ itemsCol, getSelectedStores });
  });
  createIcons();
}
