import { state } from './state.js';
import { getAndClearPendingImport, performImport } from './export-import.js';
import { navigateTo } from './nav.js';

const TITLES = {
  list:     'Delete List?',
  category: 'Delete Category?',
  store:    'Delete Store?',
  template: 'Delete Template?'
};
const MESSAGES = {
  list:     'This will permanently delete the list and all its items.',
  category: 'This category will be removed.',
  store:    'This store will be removed.',
  template: 'This template will be permanently deleted.'
};

export function confirmDelete(type, id) {
  state.pendingDelete = { type, id };
  document.getElementById('confirm-title').textContent   = TITLES[type];
  document.getElementById('confirm-message').textContent = MESSAGES[type];
  document.getElementById('confirm-ok-btn').textContent  = 'Delete';
  window.openModal('modal-confirm');
}

export function initConfirm({ db, listsCol, itemsCol, categoriesCol, storesCol, templatesCol, getDocs, writeBatch, doc, serverTimestamp, deleteDoc, setHashListId }) {
  document.getElementById('confirm-ok-btn').addEventListener('click', async () => {
    if (!state.pendingDelete) return;
    const { type, id } = state.pendingDelete;
    state.pendingDelete = null;
    window.closeModal('modal-confirm');
    try {
      if (type === 'import') {
        const data = getAndClearPendingImport();
        if (data) await performImport(data, { db, listsCol, itemsCol, categoriesCol, storesCol, templatesCol, getDocs, writeBatch, doc, serverTimestamp });

      } else if (type === 'list') {
        const itemSnap = await getDocs(itemsCol(id));
        const batch = writeBatch(db);
        itemSnap.docs.forEach(d => batch.delete(d.ref));
        batch.delete(doc(listsCol(), id));
        await batch.commit();
        if (state.currentListId === id) {
          if (state.unsubItems) { state.unsubItems(); state.unsubItems = null; }
          state.currentListId = null;
          setHashListId(null);
          navigateTo('lists');
          const headerTitle = document.getElementById('header-title');
          if (headerTitle) headerTitle.textContent = 'My Lists';
        }
        window.showToast('List deleted', 'success');

      } else if (type === 'category') {
        await deleteDoc(doc(categoriesCol(), id));
        window.showToast('Category deleted', 'success');

      } else if (type === 'store') {
        await deleteDoc(doc(storesCol(), id));
        window.showToast('Store deleted', 'success');

      } else if (type === 'template') {
        await deleteDoc(doc(templatesCol(), id));
        window.showToast('Template deleted', 'success');
      }
    } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
  });
}
