// js/categories.js
// Category and store CRUD rendering — with inline edit support.

import { escHtml, createIcons } from './utils.js';

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
          <span class="cat-emoji-display" style="font-size:1.1rem;">${cat.emoji || '\uD83C\uDFF7\uFE0F'}</span>
          <span class="cat-name-display" style="font-size:var(--text-sm);font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(cat.name)}</span>
        </div>
        <div class="cat-edit-row" style="display:none;align-items:center;gap:var(--space-2);flex:1;min-width:0;">
          <button type="button" class="cat-emoji-picker-btn"
            id="cat-emoji-btn-${cat.id}"
            title="Change emoji"
            style="font-size:1.2rem;background:none;border:1px solid var(--color-border);border-radius:var(--radius-sm);cursor:pointer;padding:2px 6px;line-height:1;flex-shrink:0;">
            ${cat.emoji || '\uD83C\uDFF7\uFE0F'}
          </button>
          <input type="hidden" id="cat-edit-emoji-${cat.id}" value="${escHtml(cat.emoji || '')}">
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

    function enterEdit() {
      display.style.display   = 'none';
      editRow.style.display   = 'flex';
      editBtn.style.display   = 'none';
      deleteBtn.style.display = 'none';
      saveBtn.style.display   = '';
      cancelBtn.style.display = '';
      nameInput.focus();
      nameInput.select();
    }

    function exitEdit() {
      display.style.display   = '';
      editRow.style.display   = 'none';
      editBtn.style.display   = '';
      deleteBtn.style.display = '';
      saveBtn.style.display   = 'none';
      cancelBtn.style.display = 'none';
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

    // Wire emoji button to the shared full-screen picker
    if (emojiBtn && emojiInput) {
      emojiBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (window.openEmojiPicker) {
          window.openEmojiPicker(`cat-edit-emoji-${cat.id}`, `cat-emoji-btn-${cat.id}`);
        }
      });
      // Keep button label in sync when picker writes to the hidden input
      const observer = new MutationObserver(() => {
        emojiBtn.textContent = emojiInput.value || '\uD83C\uDFF7\uFE0F';
      });
      observer.observe(emojiInput, { attributes: true, attributeFilter: ['value'] });
      // Also sync via input event (openEmojiPicker sets .value directly)
      emojiInput.addEventListener('change', () => {
        emojiBtn.textContent = emojiInput.value || '\uD83C\uDFF7\uFE0F';
      });
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
        <div class="store-display" style="display:flex;align-items:center;gap:var(--space-2);flex:1;min-width:0;">
          <span class="store-emoji-display" style="font-size:1.1rem;">${store.emoji || '\uD83C\uDFEA'}</span>
          <span class="store-name-display" style="font-size:var(--text-sm);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escHtml(store.name)}</span>
        </div>
        <div class="store-edit-row" style="display:none;align-items:center;gap:var(--space-2);flex:1;min-width:0;">
          <button type="button" class="store-emoji-picker-btn"
            id="store-emoji-btn-${store.id}"
            title="Change emoji"
            style="font-size:1.2rem;background:none;border:1px solid var(--color-border);border-radius:var(--radius-sm);cursor:pointer;padding:2px 6px;line-height:1;flex-shrink:0;">
            ${store.emoji || '\uD83C\uDFEA'}
          </button>
          <input type="hidden" id="store-edit-emoji-${store.id}" value="${escHtml(store.emoji || '')}">
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
    const emojiInput = card.querySelector(`#store-edit-emoji-${store.id}`);
    const emojiBtn   = card.querySelector(`#store-emoji-btn-${store.id}`);

    function enterEdit() {
      display.style.display   = 'none';
      editRow.style.display   = 'flex';
      editBtn.style.display   = 'none';
      deleteBtn.style.display = 'none';
      saveBtn.style.display   = '';
      cancelBtn.style.display = '';
      nameInput.focus();
      nameInput.select();
    }

    function exitEdit() {
      display.style.display   = '';
      editRow.style.display   = 'none';
      editBtn.style.display   = '';
      deleteBtn.style.display = '';
      saveBtn.style.display   = 'none';
      cancelBtn.style.display = 'none';
    }

    async function doSave() {
      const newName  = nameInput.value.trim();
      const newEmoji = emojiInput ? emojiInput.value.trim() : store.emoji || '';
      if (!newName) { window.showToast('Name cannot be empty', 'error'); return; }
      const duplicate = window._state?.allStores?.some(s => s.id !== store.id && s.name.toLowerCase() === newName.toLowerCase());
      if (duplicate) { window.showToast('Store already exists', 'error'); return; }
      try {
        await onUpdate(store.id, { name: newName, emoji: newEmoji });
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

    // Wire emoji button to the shared full-screen picker
    if (emojiBtn && emojiInput) {
      emojiBtn.addEventListener('click', e => {
        e.stopPropagation();
        if (window.openEmojiPicker) {
          window.openEmojiPicker(`store-edit-emoji-${store.id}`, `store-emoji-btn-${store.id}`);
        }
      });
      emojiInput.addEventListener('change', () => {
        emojiBtn.textContent = emojiInput.value || '\uD83C\uDFEA';
      });
    }
  });

  createIcons();
}

/**
 * Render store pills (checkbox labels) into a container.
 * @param {string} containerId - ID of the .store-checkboxes div
 * @param {Array}  allStores   - array of { id, name, emoji } objects
 * @param {Array}  [selected]  - array of store names that should be pre-checked
 */
export function populateStorePills(containerId, allStores, selected = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  if (!allStores || allStores.length === 0) {
    container.innerHTML = '<span style="font-size:var(--text-xs);color:var(--color-text-faint);">No stores added yet</span>';
    return;
  }
  container.innerHTML = allStores.map(s => {
    const label = (s.emoji ? s.emoji + '\u00a0' : '') + escHtml(s.name);
    const checked = selected.includes(s.name) ? 'checked' : '';
    return `<label class="store-checkbox-label">
      <input type="checkbox" value="${escHtml(s.name)}" ${checked}>
      ${label}
    </label>`;
  }).join('');
}

// Keep old name as alias so any other callers don't break
export const populateStoreSelect = populateStorePills;
