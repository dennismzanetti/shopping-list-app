import { state } from './state.js';

let pendingImportData = null;

export function getAndClearPendingImport() {
  const d = pendingImportData;
  pendingImportData = null;
  return d;
}

// ── Export ───────────────────────────────────────────────────────────────────
export async function exportData({ listsCol, itemsCol, categoriesCol, storesCol, templatesCol, getDocs, query, orderBy }) {
  try {
    window.showToast('Preparing export…', 'info');
    const listsSnap = await getDocs(query(listsCol(), orderBy('createdAt', 'desc')));
    const lists = await Promise.all(listsSnap.docs.map(async ld => {
      const listData = { id: ld.id, ...ld.data() };
      if (listData.createdAt?.toDate) listData.createdAt = listData.createdAt.toDate().toISOString();
      const itemsSnap = await getDocs(itemsCol(ld.id));
      listData.items = itemsSnap.docs.map(id => {
        const d = { id: id.id, ...id.data() };
        if (d.createdAt?.toDate) d.createdAt = d.createdAt.toDate().toISOString();
        if (d.updatedAt?.toDate) d.updatedAt = d.updatedAt.toDate().toISOString();
        return d;
      });
      return listData;
    }));
    const ts = d => { const o = { id: d.id, ...d.data() }; if (o.createdAt?.toDate) o.createdAt = o.createdAt.toDate().toISOString(); if (o.updatedAt?.toDate) o.updatedAt = o.updatedAt.toDate().toISOString(); return o; };
    const categories = (await getDocs(query(categoriesCol(), orderBy('createdAt')))).docs.map(ts);
    const stores     = (await getDocs(query(storesCol(),     orderBy('createdAt')))).docs.map(ts);
    const templates  = (await getDocs(query(templatesCol(),  orderBy('createdAt')))).docs.map(ts);
    const payload = { exportedAt: new Date().toISOString(), version: 1, lists, categories, stores, templates };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `shoplist-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
    URL.revokeObjectURL(url);
    window.showToast('Export downloaded!', 'success');
  } catch (e) { window.showToast('Export failed: ' + e.message, 'error'); }
}

// ── Import ───────────────────────────────────────────────────────────────────
export function handleImportFile(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data.lists || !data.categories || !data.stores || !data.templates) {
        window.showToast('Invalid backup file — missing required data.', 'error'); return;
      }
      const lc = data.lists.length;
      const ic = data.lists.reduce((s, l) => s + (l.items?.length || 0), 0);
      const cc = data.categories.length, sc = data.stores.length, tc = data.templates.length;
      pendingImportData = data;
      state.pendingDelete = { type: 'import' };
      document.getElementById('confirm-title').textContent = 'Replace All Data?';
      document.getElementById('confirm-message').textContent =
        `This will permanently delete all current data, then restore from the backup ` +
        `(${lc} list${lc!==1?'s':''}, ${ic} item${ic!==1?'s':''}, ${cc} categor${cc!==1?'ies':'y'}, ` +
        `${sc} store${sc!==1?'s':''}, ${tc} template${tc!==1?'s':''}). This cannot be undone.`;
      document.getElementById('confirm-ok-btn').textContent = 'Replace & Import';
      window.openModal('modal-confirm');
    } catch { window.showToast('Could not parse file — make sure it is a valid ShopList JSON backup.', 'error'); }
  };
  reader.readAsText(file);
}

export async function performImport(data, { db, listsCol, itemsCol, categoriesCol, storesCol, templatesCol, getDocs, writeBatch, doc, serverTimestamp }) {
  window.showToast('Importing… please wait.', 'info');
  try {
    const deleteInBatches = async snap => {
      for (let i = 0; i < snap.docs.length; i += 400) {
        const batch = writeBatch(db);
        snap.docs.slice(i, i + 400).forEach(d => batch.delete(d.ref));
        await batch.commit();
      }
    };
    const listsSnap = await getDocs(listsCol());
    for (const ld of listsSnap.docs) await deleteInBatches(await getDocs(itemsCol(ld.id)));
    await deleteInBatches(listsSnap);
    await deleteInBatches(await getDocs(categoriesCol()));
    await deleteInBatches(await getDocs(storesCol()));
    await deleteInBatches(await getDocs(templatesCol()));

    let batch = writeBatch(db), opCount = 0;
    const maybeFlush = async () => { if (++opCount >= 400) { await batch.commit(); batch = writeBatch(db); opCount = 0; } };
    for (const cat  of (data.categories||[])) { const {id,...f}=cat;  f.createdAt=serverTimestamp(); batch.set(doc(categoriesCol(),id),f); await maybeFlush(); }
    for (const st   of (data.stores||[]))     { const {id,...f}=st;   f.createdAt=serverTimestamp(); batch.set(doc(storesCol(),id),f);     await maybeFlush(); }
    for (const tpl  of (data.templates||[]))  { const {id,...f}=tpl;  f.createdAt=serverTimestamp(); f.updatedAt=serverTimestamp(); batch.set(doc(templatesCol(),id),f); await maybeFlush(); }
    for (const list of (data.lists||[])) {
      const {id:lid, items, ...lf} = list;
      lf.createdAt = serverTimestamp();
      batch.set(doc(listsCol(), lid), lf); await maybeFlush();
      for (const item of (items||[])) {
        const {id:iid, ...itemf} = item;
        itemf.createdAt = serverTimestamp(); itemf.updatedAt = serverTimestamp();
        batch.set(doc(itemsCol(lid), iid), itemf); await maybeFlush();
      }
    }
    await batch.commit();
    window.showToast('Import complete!', 'success');
  } catch (e) { window.showToast('Import failed: ' + e.message, 'error'); }
}

// ── Init ──────────────────────────────────────────────────────────────────────
export function initExportImport(deps) {
  document.getElementById('export-data-btn').addEventListener('click', () => exportData(deps));
  document.getElementById('import-data-btn').addEventListener('click', () => {
    const input = document.getElementById('import-file-input');
    input.value = ''; input.click();
  });
  document.getElementById('import-file-input').addEventListener('change', e => handleImportFile(e.target.files[0]));
}
