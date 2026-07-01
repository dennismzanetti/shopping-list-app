// js/categories-stores.js
import { state } from './state.js';
import { escHtml } from './utils.js';

export function initCategoriesStores({ categoriesCol, storesCol, addDoc, serverTimestamp }) {

  // -- Categories -------------------------------------------------------------
  const catForm  = document.getElementById('add-category-form');
  const catInput = document.getElementById('new-category-name');
  const catEmoji = document.getElementById('new-category-emoji');

  if (catForm) {
    catForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name  = catInput ? catInput.value.trim() : '';
      const emoji = catEmoji ? catEmoji.value.trim() : '';
      if (!name) return;
      const exists = state.allCategories.some(c => c.name.toLowerCase() === name.toLowerCase());
      if (exists) { window.showToast('Category already exists', 'error'); return; }
      await addDoc(categoriesCol(), { name, emoji, createdAt: serverTimestamp() });
      if (catInput) catInput.value = '';
      if (catEmoji) catEmoji.value = '';
      window.showToast('Category added', 'success');
    });
  }

  // Emoji picker for category
  const emojiBtn    = document.getElementById('category-emoji-btn');
  const emojiPicker = document.getElementById('category-emoji-picker');
  const emojiGrid   = document.getElementById('category-emoji-grid');
  const EMOJIS = ['🍎','🥦','🥩','🍞','🧀','🥚','🧊','🥤','🍿','🧹','🧴','🫙','🥫','🧂','🥪','🥣','🍷','👶','🐾','💊','📦','🛒','🏠','🎉','🥗','🍝','🥞'];

  if (emojiBtn && emojiPicker && emojiGrid) {
    emojiGrid.innerHTML = EMOJIS.map(em =>
      `<button type="button" class="emoji-option" data-emoji="${em}">${em}</button>`
    ).join('');
    emojiBtn.addEventListener('click', () => emojiPicker.classList.toggle('open'));
    emojiGrid.querySelectorAll('.emoji-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (catEmoji) catEmoji.value = btn.dataset.emoji;
        if (emojiBtn) emojiBtn.textContent = btn.dataset.emoji;
        emojiPicker.classList.remove('open');
      });
    });
    document.addEventListener('click', e => {
      if (!emojiBtn.contains(e.target) && !emojiPicker.contains(e.target)) emojiPicker.classList.remove('open');
    });
  }

  // -- Stores -----------------------------------------------------------------
  const storeForm  = document.getElementById('add-store-form');
  const storeInput = document.getElementById('new-store-name');

  if (storeForm) {
    storeForm.addEventListener('submit', async e => {
      e.preventDefault();
      const name = storeInput ? storeInput.value.trim() : '';
      if (!name) return;
      const exists = state.allStores.some(s => s.name.toLowerCase() === name.toLowerCase());
      if (exists) { window.showToast('Store already exists', 'error'); return; }
      await addDoc(storesCol(), { name, createdAt: serverTimestamp() });
      if (storeInput) storeInput.value = '';
      window.showToast('Store added', 'success');
    });
  }
}
