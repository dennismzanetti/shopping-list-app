// Wires the add-category and add-store modal listeners.
// renderCategories / renderStores / populateStoreSelect live in js/categories.js.

export function initCategoriesStores({ categoriesCol, storesCol, addDoc, serverTimestamp }) {

  // ── Categories ──────────────────────────────────────────────────────────────────
  document.getElementById('new-category-btn').addEventListener('click', () =>
    window.openModal('modal-new-category')
  );

  // Wire up the category emoji picker
  const catEmojiBtn      = document.getElementById('cat-emoji-btn');
  const catEmojiInput    = document.getElementById('new-category-emoji');
  const catEmojiPopover  = document.getElementById('cat-emoji-picker-popover');

  catEmojiBtn.addEventListener('click', e => {
    e.stopPropagation();
    const open = catEmojiPopover.classList.toggle('open');
    catEmojiBtn.setAttribute('aria-expanded', open);
  });

  catEmojiPopover.querySelectorAll('.emoji-option').forEach(btn => {
    btn.addEventListener('click', () => {
      const emoji = btn.dataset.emoji;
      catEmojiInput.value = emoji;
      catEmojiBtn.textContent = emoji;
      catEmojiPopover.classList.remove('open');
      catEmojiBtn.setAttribute('aria-expanded', 'false');
    });
  });

  // Close picker when clicking outside
  document.addEventListener('click', e => {
    if (!catEmojiBtn.contains(e.target) && !catEmojiPopover.contains(e.target)) {
      catEmojiPopover.classList.remove('open');
      catEmojiBtn.setAttribute('aria-expanded', 'false');
    }
  });

  const resetCategoryModal = () => {
    document.getElementById('new-category-name').value = '';
    catEmojiInput.value = '';
    catEmojiBtn.textContent = '🏷️';
    catEmojiPopover.classList.remove('open');
  };

  const saveCategory = async () => {
    const name = document.getElementById('new-category-name').value.trim();
    if (!name) { window.showToast('Category name is required', 'error'); return; }
    try {
      await addDoc(categoriesCol(), {
        name,
        emoji: catEmojiInput.value.trim(),
        createdAt: serverTimestamp()
      });
      window.closeModal('modal-new-category');
      resetCategoryModal();
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
