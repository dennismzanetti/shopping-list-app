// js/categories.js
// Category and store CRUD rendering — with inline edit support.

import { escHtml, createIcons } from './utils.js';

// Shared compact emoji list for the inline picker
const INLINE_EMOJIS = [
  '🍎','🍊','🍋','🍇','🍓','🥦','🥕','🥑','🌽','🍅','🧅','🧄','🥬',
  '🥩','🍗','🥚','🧀','🥛','🧈',
  '🍞','🥐','🥖','🧁','🎂',
  '🍝','🍚','🥫','🧂','🫙','🍯',
  '☕','🧃','🍷','🍺','💧',
  '🧹','🧺','🧻','🧼','🪥','🏠',
  '💊','🩺','🌿',
  '🛒','🛍️','📋','🧾','💳',
  '🐶','🐱','🐾','🦴','🐟','🐦','🐇','🐹','🐠','🦮',
  '⭐','❤️','🎉','📦','🏷️','🥗'
];

function buildInlineEmojiPicker(currentEmoji, inputId, btnId) {
  return `
    <div class="inline-emoji-wrap" style="position:relative;display:inline-flex;align-items:center;">
      <button type="button" class="inline-emoji-btn" id="${btnId}" title="Change emoji"
        style="font-size:1.2rem;background:none;border:none;cursor:pointer;padding:0 2px;line-height:1;">
        ${currentEmoji || '🏷️'}
      </button>
      <div class="inline-emoji-popover" id="${btnId}-popover"
        style="display:none;position:absolute;top:calc(100% + 4px);left:0;z-index:200;
               background:var(--color-surface-2);border:1px solid var(--color-border);
               border-radius:var(--radius-md);padding:var(--space-2);box-shadow:var(--shadow-md);
               display:none;flex-wrap:wrap;gap:2px;width:220px;">
        ${INLINE_EMOJIS.map(em =>
          `<button type="button" class="inline-emoji-opt" data-emoji="${em}"
            style="font-size:1.1rem;background:none;border:none;cursor:pointer;padding:2px;border-radius:4px;">${em}</button>`
        ).join('')}
      </div>
      <input type="hidden" id="${inputId}" value="${escHtml(currentEmoji || '')}">
    </div>`;
}

// -- Categories ---------------------------------------------------------------
export function renderCategories(allCategories, onDelete, onUpdate) {
  const grid = document.getElementById('categories-grid');
  if (!grid) return;
  if (allCategories.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><i data-lucide="tag"></i></div><h3>No categories</h3><p>Add a category to organize your items.</p></div>`;
    createIcons(); return;
  }

  grid.innerHTML = allCategories.map(cat => `
    <div class="card" data-cat-id="${cat.id}">
      <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);">
        <div class="cat-display" style="display:flex;align-items:center;gap:var(--space-2);flex:1;min-width:0;">
          <span class="cat-emoji-display" style="font-size:1.1rem;">${cat.emoji || '🏷️'}</span>
          <span class="cat-name-display" style="font-size:var(--text-sm);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(cat.name)}</span>
        </div>
        <div class="cat-edit-row" style="display:none;align-items:center;gap:var(--space-2);flex:1;min-width:0;">
          ${buildInlineEmojiPicker(cat.emoji, `cat-edit-emoji-${cat.id}`, `cat-emoji-btn-${cat.id}`)}
          <input class="form-input cat-name-input" data-cat-name-input="${cat.id}"
            value="${escHtml(cat.name)}"
            style="flex:1;min-width:0;padding:var(--space-1) var(--space-2);font-size:var(--text-sm);height:32px;">
        </div>
        <div class="cat-actions" style="display:flex;gap:var(--space-1);flex-shrink:0;">
          <button class="icon-btn cat-edit-btn" data-edit-cat="${cat.id}" aria-label="Edit" title="Edit">
            <i data-lucide="pencil"></i>
          </button>
          <button class="icon-btn cat-save-btn" data-save-cat="${cat.id}" aria-label="Save" title="Save" style="display:none;color:var(--color-success);">
            <i data-lucide="check"></i>
          </button>
          <button class="icon-btn cat-cancel-btn" data-cancel-cat="${cat.id}" aria-label="Cancel" title="Cancel" style="display:none;">
            <i data-lucide="x"></i>
          </button>
          <button class="icon-btn cat-delete-btn" data-delete-cat="${cat.id}" aria-label="Delete" title="Delete" style="color:var(--color-error);">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    </div>`).join('');

  // Wire up interactions for each card
  allCategories.forEach(cat => {
    const card       = grid.querySelector(`[data-cat-id="${cat.id}"]`);
    if (!card) return;
    const display    = card.querySelector('.cat-display');
    const editRow    = card.querySelector('.cat-edit-row');
    const editBtn    = card.querySelector('[data-edit-cat]');
    const saveBtn    = card.querySelector('[data-save-cat]');
    const cancelBtn  = card.querySelector('[data-cancel-cat]');
    const deleteBtn  = card.querySelector('[data-delete-cat]');
    const nameInput  = card.querySelector('[data-cat-name-input]');
    const emojiInput = card.querySelector(`#cat-edit-emoji-${cat.id}`);
    const emojiBtn   = card.querySelector(`#cat-emoji-btn-${cat.id}`);
    const popover    = card.querySelector(`#cat-emoji-btn-${cat.id}-popover`);

    function enterEdit() {
      display.style.display  = 'none';
      editRow.style.display  = 'flex';
      editBtn.style.display  = 'none';
      deleteBtn.style.display = 'none';
      saveBtn.style.display  = '';
      cancelBtn.style.display = '';
      nameInput.focus();
      nameInput.select();
    }

    function exitEdit() {
      display.style.display  = '';
      editRow.style.display  = 'none';
      editBtn.style.display  = '';
      deleteBtn.style.display = '';
      saveBtn.style.display  = 'none';
      cancelBtn.style.display = 'none';
      if (popover) popover.style.display = 'none';
    }

    async function doSave() {
      const newName  = nameInput.value.trim();
      const newEmoji = emojiInput ? emojiInput.value.trim() : cat.emoji || '';
      if (!newName) { window.showToast('Name cannot be empty', 'error'); return; }
      const duplicate = window._state?.allCategories?.some(c => c.id !== cat.id && c.name.toLowerCase() === newName.toLowerCase());
      if (duplicate) { window.showToast('Category already exists', 'error'); return; }
      try {
        await onUpdate(cat.id, { name: newName, emoji: newEmoji });
        window.showToast('Category updated', 'success');
      } catch(e) { window.showToast('Error: ' + e.message, 'error'); }
    }

    editBtn.addEventListener('click', enterEdit);
    cancelBtn.addEventListener('click', exitEdit);
    saveBtn.addEventListener('click', doSave);
    deleteBtn.addEventListener('click', () => onDelete('category', cat.id));

    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); doSave(); }
      if (e.key === 'Escape') { e.preventDefault(); exitEdit(); }
    });

    // Emoji picker toggle
    if (emojiBtn && popover) {
      emojiBtn.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = popover.style.display === 'flex';
        popover.style.display = isOpen ? 'none' : 'flex';
      });
      popover.querySelectorAll('.inline-emoji-opt').forEach(opt => {
        opt.addEventListener('click', () => {
          if (emojiInput) emojiInput.value = opt.dataset.emoji;
          emojiBtn.textContent = opt.dataset.emoji;
          popover.style.display = 'none';
        });
      });
      document.addEventListener('click', e => {
        if (!emojiBtn.contains(e.target) && !popover.contains(e.target))
          popover.style.display = 'none';
      }, { passive: true });
    }
  });

  createIcons();
}

// -- Stores -------------------------------------------------------------------
export function renderStores(allStores, onDelete, onUpdate) {
  const grid = document.getElementById('stores-grid');
  if (!grid) return;
  if (allStores.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><i data-lucide="store"></i></div><h3>No stores</h3><p>Add your favorite grocery stores.</p></div>`;
    createIcons(); return;
  }
  grid.innerHTML = allStores.map(store => `
    <div class="card" data-store-id="${store.id}">
      <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;gap:var(--space-2);">
        <div class="store-display" style="flex:1;min-width:0;">
          <span class="store-name-display" style="font-size:var(--text-sm);font-weight:600;">${escHtml(store.name)}</span>
        </div>
        <div class="store-edit-row" style="display:none;align-items:center;gap:var(--space-2);flex:1;min-width:0;">
          <input class="form-input store-name-input" data-store-name-input="${store.id}"
            value="${escHtml(store.name)}"
            style="flex:1;min-width:0;padding:var(--space-1) var(--space-2);font-size:var(--text-sm);height:32px;">
        </div>
        <div class="store-actions" style="display:flex;gap:var(--space-1);flex-shrink:0;">
          <button class="icon-btn store-edit-btn" data-edit-store="${store.id}" aria-label="Edit" title="Edit">
            <i data-lucide="pencil"></i>
          </button>
          <button class="icon-btn store-save-btn" data-save-store="${store.id}" aria-label="Save" title="Save" style="display:none;color:var(--color-success);">
            <i data-lucide="check"></i>
          </button>
          <button class="icon-btn store-cancel-btn" data-cancel-store="${store.id}" aria-label="Cancel" title="Cancel" style="display:none;">
            <i data-lucide="x"></i>
          </button>
          <button class="icon-btn store-delete-btn" data-delete-store="${store.id}" aria-label="Delete" title="Delete" style="color:var(--color-error);">
            <i data-lucide="trash-2"></i>
          </button>
        </div>
      </div>
    </div>`).join('');

  allStores.forEach(store => {
    const card      = grid.querySelector(`[data-store-id="${store.id}"]`);
    if (!card) return;
    const display   = card.querySelector('.store-display');
    const editRow   = card.querySelector('.store-edit-row');
    const editBtn   = card.querySelector('[data-edit-store]');
    const saveBtn   = card.querySelector('[data-save-store]');
    const cancelBtn = card.querySelector('[data-cancel-store]');
    const deleteBtn = card.querySelector('[data-delete-store]');
    const nameInput = card.querySelector('[data-store-name-input]');

    function enterEdit() {
      display.style.display  = 'none';
      editRow.style.display  = 'flex';
      editBtn.style.display  = 'none';
      deleteBtn.style.display = 'none';
      saveBtn.style.display  = '';
      cancelBtn.style.display = '';
      nameInput.focus();
      nameInput.select();
    }

    function exitEdit() {
      display.style.display  = '';
      editRow.style.display  = 'none';
      editBtn.style.display  = '';
      deleteBtn.style.display = '';
      saveBtn.style.display  = 'none';
      cancelBtn.style.display = 'none';
    }

    async function doSave() {
      const newName = nameInput.value.trim();
      if (!newName) { window.showToast('Name cannot be empty', 'error'); return; }
      const duplicate = window._state?.allStores?.some(s => s.id !== store.id && s.name.toLowerCase() === newName.toLowerCase());
      if (duplicate) { window.showToast('Store already exists', 'error'); return; }
      try {
        await onUpdate(store.id, { name: newName });
        window.showToast('Store updated', 'success');
      } catch(e) { window.showToast('Error: ' + e.message, 'error'); }
    }

    editBtn.addEventListener('click', enterEdit);
    cancelBtn.addEventListener('click', exitEdit);
    saveBtn.addEventListener('click', doSave);
    deleteBtn.addEventListener('click', () => onDelete('store', store.id));

    nameInput.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); doSave(); }
      if (e.key === 'Escape') { e.preventDefault(); exitEdit(); }
    });
  });

  createIcons();
}

export function populateStoreSelect(allStores) {
  const sel = document.getElementById('new-list-store');
  if (!sel) return;
  sel.innerHTML = '<option value="">No default store</option>' +
    allStores.map(s => `<option value="${escHtml(s.name)}">${escHtml(s.name)}</option>`).join('');
}
