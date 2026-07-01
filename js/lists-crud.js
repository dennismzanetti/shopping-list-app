// lists-crud.js - wires New List modal, list detail header, and item action buttons
import { state } from './state.js';
import { escHtml, createIcons } from './utils.js';

export function initNewList({ listsCol, addDoc, serverTimestamp, openList, confirmDelete }) {
  const form = document.getElementById('new-list-form');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const name = document.getElementById('list-name').value.trim();
    if (!name) return;
    const docRef = await addDoc(listsCol(), { name, createdAt: serverTimestamp() });
    window.closeModal('new-list-modal');
    document.getElementById('list-name').value = '';
    openList(docRef.id);
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

  const deleteBtn = document.getElementById('delete-list-btn');
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
