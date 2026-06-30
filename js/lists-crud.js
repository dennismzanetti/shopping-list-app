import { state } from './state.js';
import { renderLists } from './lists.js';

// ── New List ─────────────────────────────────────────────────────────────────
export function initNewList({ listsCol, addDoc, serverTimestamp, openList, confirmDelete }) {
  document.getElementById('new-list-btn').addEventListener('click', () =>
    window.openModal('modal-new-list')
  );

  document.getElementById('search-lists').addEventListener('input', () =>
    renderLists(openList, confirmDelete)
  );

  const createList = async () => {
    const name = document.getElementById('new-list-name').value.trim();
    if (!name) { window.showToast('Please enter a list name', 'error'); return; }
    try {
      await addDoc(listsCol(), {
        name,
        storeName: document.getElementById('new-list-store').value || '',
        itemCount: 0,
        checkedCount: 0,
        createdAt: serverTimestamp()
      });
      window.closeModal('modal-new-list');
      document.getElementById('new-list-name').value  = '';
      document.getElementById('new-list-store').value = '';
      window.showToast(`"${name}" created!`, 'success');
    } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
  };

  document.getElementById('create-list-btn').addEventListener('click', createList);
  document.getElementById('new-list-name').addEventListener('keydown', e => { if (e.key === 'Enter') createList(); });
}

// ── List Detail Nav ──────────────────────────────────────────────────────────
export function initListDetail({ confirmDelete, navigateTo, setHashListId }) {
  document.getElementById('back-to-lists').addEventListener('click', () => {
    if (state.unsubItems) { state.unsubItems(); state.unsubItems = null; }
    state.currentListId = null;
    setHashListId(null);
    navigateTo('lists');
    document.getElementById('header-title').textContent = 'My Lists';
  });

  document.getElementById('detail-delete-btn').addEventListener('click', () => {
    if (state.currentListId) confirmDelete('list', state.currentListId);
  });
}

// ── Item Buttons ─────────────────────────────────────────────────────────────
export function initItemButtons({ openAddItemModal, saveItem, itemsCol, getSelectedStores }) {
  document.getElementById('add-item-quick-btn').addEventListener('click', () => openAddItemModal());
  document.getElementById('save-item-btn').addEventListener('click',  () => saveItem({ itemsCol, getSelectedStores }));
  document.getElementById('item-name-full').addEventListener('keydown', e => { if (e.key === 'Enter') saveItem({ itemsCol, getSelectedStores }); });
}
