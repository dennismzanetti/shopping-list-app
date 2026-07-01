// js/export-import.js
import { state } from './state.js';
import {
  collection, getDocs, doc, addDoc, updateDoc, deleteDoc,
  writeBatch, serverTimestamp, query, orderBy
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';

// -- Pending Import State -----------------------------------------------------
let _pendingImport = null;

export function setPendingImport(data) {
  _pendingImport = data;
}

export function getAndClearPendingImport() {
  const data = _pendingImport;
  _pendingImport = null;
  return data;
}

// -- Export -------------------------------------------------------------------
async function exportData({ db, listsCol, itemsCol, categoriesCol, storesCol, templatesCol, getDocs, query, orderBy }) {
  const [listsSnap, catsSnap, storesSnap, tplSnap] = await Promise.all([
    getDocs(query(listsCol(), orderBy('createdAt'))),
    getDocs(query(categoriesCol(), orderBy('createdAt'))),
    getDocs(query(storesCol(), orderBy('createdAt'))),
    getDocs(query(templatesCol(), orderBy('createdAt'))),
  ]);
  const lists = [];
  for (const d of listsSnap.docs) {
    const itemsSnap = await getDocs(query(itemsCol(d.id), orderBy('createdAt')));
    lists.push({ ...d.data(), id: d.id, items: itemsSnap.docs.map(i => ({ id: i.id, ...i.data() })) });
  }
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    lists,
    categories: catsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    stores:     storesSnap.docs.map(d => ({ id: d.id, ...d.data() })),
    templates:  tplSnap.docs.map(d => ({ id: d.id, ...d.data() })),
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `shoplist-backup-${new Date().toISOString().slice(0,10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  window.showToast('Export complete!', 'success');
}

// -- Import -------------------------------------------------------------------
export async function performImport(data, deps) {
  const { db, listsCol, itemsCol, categoriesCol, storesCol, templatesCol,
          getDocs, writeBatch, doc, addDoc, serverTimestamp } = deps;
  try {
    if (!data.lists || !data.categories || !data.stores) {
      window.showToast('Invalid backup file - missing required data.', 'error'); return;
    }
    const batch = writeBatch(db);
    // Wipe existing
    const [el, ec, es, et] = await Promise.all([
      getDocs(listsCol()), getDocs(categoriesCol()), getDocs(storesCol()), getDocs(templatesCol())
    ]);
    for (const d of [...el.docs, ...ec.docs, ...es.docs, ...et.docs]) batch.delete(d.ref);
    await batch.commit();
    // Import categories, stores, templates
    for (const c of (data.categories || [])) await addDoc(categoriesCol(), { name: c.name, emoji: c.emoji || '', createdAt: serverTimestamp() });
    for (const s of (data.stores     || [])) await addDoc(storesCol(),     { name: s.name, createdAt: serverTimestamp() });
    for (const t of (data.templates  || [])) {
      const { id: _id, items, ...tData } = t;
      const ref = await addDoc(templatesCol(), { ...tData, createdAt: serverTimestamp() });
      for (const item of (items || [])) {
        const { id: _iid, ...iData } = item;
        await addDoc(collection(db, ref.path, 'items'), { ...iData, createdAt: serverTimestamp() });
      }
    }
    // Import lists + items
    for (const l of data.lists) {
      const { id: _id, items, ...lData } = l;
      const ref = await addDoc(listsCol(), { ...lData, createdAt: serverTimestamp() });
      for (const item of (items || [])) {
        const { id: _iid, ...iData } = item;
        await addDoc(itemsCol(ref.id), { ...iData, createdAt: serverTimestamp() });
      }
    }
    window.showToast('Import complete!', 'success');
  } catch { window.showToast('Could not parse file - make sure it is a valid ShopList JSON backup.', 'error'); }
}

// -- Init ---------------------------------------------------------------------
export function initExportImport(deps) {
  const exportBtn   = document.getElementById('export-data-btn');
  const importBtn   = document.getElementById('import-data-btn');
  const importInput = document.getElementById('import-file-input');

  if (exportBtn) exportBtn.addEventListener('click', () => exportData(deps));
  if (importBtn) importBtn.addEventListener('click', () => importInput && importInput.click());
  if (importInput) {
    importInput.addEventListener('change', async e => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const data = JSON.parse(text);
        if (!data.lists || !data.categories || !data.stores) {
          window.showToast('Invalid backup file - missing required data.', 'error');
          importInput.value = '';
          return;
        }
        // Store data and trigger confirm dialog
        setPendingImport(data);
        state.pendingDelete = { type: 'import', id: null };
        document.getElementById('confirm-title').textContent   = 'Replace all data?';
        document.getElementById('confirm-message').textContent = 'This will permanently replace all current lists, items, categories, stores, and templates with the backup file.';
        document.getElementById('confirm-ok-btn').textContent  = 'Import';
        window.openModal('modal-confirm');
      } catch {
        window.showToast('Could not parse file - make sure it is a valid ShopList JSON backup.', 'error');
      }
      importInput.value = '';
    });
  }
}
