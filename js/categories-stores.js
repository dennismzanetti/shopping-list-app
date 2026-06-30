// Wires the add-category and add-store modal listeners.
// renderCategories / renderStores / populateStoreSelect live in js/categories.js.

export function initCategoriesStores({ categoriesCol, storesCol, addDoc, serverTimestamp }) {

  // ── Categories ──────────────────────────────────────────────────────────────────
  document.getElementById('new-category-btn').addEventListener('click', () =>
    window.openModal('modal-new-category')
  );

  const saveCategory = async () => {
    const name = document.getElementById('new-category-name').value.trim();
    if (!name) { window.showToast('Category name is required', 'error'); return; }
    try {
      await addDoc(categoriesCol(), {
        name,
        emoji: document.getElementById('new-category-emoji').value.trim(),
        createdAt: serverTimestamp()
      });
      window.closeModal('modal-new-category');
      document.getElementById('new-category-name').value  = '';
      document.getElementById('new-category-emoji').value = '';
      window.showToast(`"${name}" added!`, 'success');
    } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
  };

  document.getElementById('save-category-btn').addEventListener('click', saveCategory);
  document.getElementById('new-category-name').addEventListener('keydown', e => { if (e.key === 'Enter') saveCategory(); });

  // ── Stores ────────────────────────────────────────────────────────────────────
  document.getElementById('new-store-btn').addEventListener('click', () =>
    window.openModal('modal-new-store')
  );

  const saveStore = async () => {
    const name = document.getElementById('new-store-name').value.trim();
    if (!name) { window.showToast('Store name is required', 'error'); return; }
    try {
      await addDoc(storesCol(), { name, createdAt: serverTimestamp() });
      window.closeModal('modal-new-store');
      document.getElementById('new-store-name').value = '';
      window.showToast(`"${name}" added!`, 'success');
    } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
  };

  document.getElementById('save-store-btn').addEventListener('click', saveStore);
  document.getElementById('new-store-name').addEventListener('keydown', e => { if (e.key === 'Enter') saveStore(); });
}
