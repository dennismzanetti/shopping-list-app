// js/lists.js
import { state } from './state.js';
import { escHtml, createIcons } from './utils.js';

// -- Lists --------------------------------------------------------------------
export function renderLists(onOpen, onDelete, onVisibilityChange) {
  const grid = document.getElementById('lists-grid');
  if (!grid) return;
  if (state.allLists.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1">
      <div class="empty-state-icon"><i data-lucide="shopping-cart"></i></div>
      <h3>No lists yet</h3><p>Create your first shopping list to get started.</p>
      <button class="btn btn-primary" onclick="window.openModal('modal-new-list')">Create a list</button>
    </div>`;
    createIcons(); return;
  }

  const uid = state.currentUser?.uid;

  grid.innerHTML = state.allLists.map(list => {
    const total   = list.itemCount   || 0;
    const checked = list.checkedCount || 0;
    const pct     = total > 0 ? Math.round((checked / total) * 100) : 0;
    const isOwned = list.ownerId === uid;
    const isPublic = list.visibility === 'public';

    // Static visibility pill for all users (toggle lives in the detail view)
    const visControl = `<span class="badge-shared" style="${!isPublic ? 'background:var(--color-surface-offset);color:var(--color-text-muted);' : ''}">
        <i data-lucide="${isPublic ? 'users' : 'lock'}" style="width:11px;height:11px;"></i>
        ${isPublic ? 'Public' : 'Private'}
      </span>`;

    // Owner label for shared/public lists from other users
    const ownerBadge = (!isOwned && list.ownerName)
      ? `<span class="badge-shared" style="background:var(--color-surface-offset);color:var(--color-text-muted);font-size:var(--text-xs);">— ${escHtml(list.ownerName)}</span>`
      : '';

    // Delete button only for owner
    const deleteBtn = isOwned
      ? `<button class="icon-btn" data-delete-list="${list.id}" aria-label="Delete list" style="color:var(--color-error);flex-shrink:0;"><i data-lucide="trash-2"></i></button>`
      : '';

    const emoji = list.emoji || '🛒';
    const desc  = list.description ? `<div class="list-card-desc">${escHtml(list.description)}</div>` : '';

    return `
    <div class="list-card" data-list-id="${list.id}">
      <div class="list-card-header">
        <div class="list-card-emoji">${escHtml(emoji)}</div>
        <div class="list-card-info">
          <div class="list-card-title">${escHtml(list.name)}</div>
          ${desc}
        </div>
        ${deleteBtn}
      </div>
      <div class="progress-bar" style="margin-top:var(--space-3);"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div class="list-card-footer" style="justify-content:space-between;">
        <span class="list-item-count">${total} item${total !== 1 ? 's' : ''} &middot; ${checked} done${ownerBadge ? ' ' : ''}${ownerBadge}</span>
        ${visControl}
      </div>
    </div>`;
  }).join('');

  // Open list on card click
  grid.querySelectorAll('.list-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('[data-delete-list]')) return;
      onOpen(card.dataset.listId);
    });
  });

  // Delete
  grid.querySelectorAll('[data-delete-list]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      onDelete('list', btn.dataset.deleteList);
    });
  });

  createIcons();
}

// -- Populate store checkboxes in the detail view ----------------------------
export function populateDetailStoreCheckboxes(stores, selectedStores = []) {
  const container = document.getElementById('detail-store-checkboxes');
  if (!container) return;
  if (!stores || stores.length === 0) {
    container.innerHTML = '<span style="font-size:var(--text-xs);color:var(--color-text-faint);">No stores added yet</span>';
    return;
  }
  container.innerHTML = stores.map(s => {
    const checked = selectedStores.includes(s.name) ? 'checked' : '';
    return `<label class="store-checkbox-label">
      <input type="checkbox" class="store-checkbox" value="${escHtml(s.name)}" ${checked}>
      <span>${s.emoji ? escHtml(s.emoji) + ' ' : ''}${escHtml(s.name)}</span>
    </label>`;
  }).join('');
}

// -- Get selected stores from detail view ------------------------------------
export function getDetailSelectedStores() {
  const container = document.getElementById('detail-store-checkboxes');
  if (!container) return [];
  return Array.from(container.querySelectorAll('.store-checkbox:checked')).map(cb => cb.value);
}

// -- List Detail --------------------------------------------------------------
export function openList(listId, { navigateTo, setHashListId, onSnapshot, itemsCol, renderItems, updateListCounts, updateDoc, doc, listsCol, showToast, openEmojiPicker }) {
  state.currentListId = listId;
  setHashListId(listId);
  const list = state.allLists.find(l => l.id === listId);
  const isOwned = !list?.ownerId || list.ownerId === state.currentUser?.uid;

  // Populate page title
  const nameEl = document.getElementById('detail-list-name');
  if (nameEl) nameEl.textContent = list ? list.name : '';

  // Populate Details card fields
  const nameInput  = document.getElementById('detail-list-name-input');
  const descInput  = document.getElementById('detail-list-desc');
  const emojiBtn   = document.getElementById('detail-emoji-btn');
  const emojiInput = document.getElementById('detail-list-emoji');

  if (nameInput) nameInput.value = list ? (list.name || '') : '';
  if (descInput) descInput.value = list ? (list.description || '') : '';

  const emoji = list?.emoji || '';
  if (emojiInput) emojiInput.value = emoji;
  if (emojiBtn)   emojiBtn.textContent = emoji || '🛒';

  // Disable editing controls for non-owners
  [nameInput, descInput].forEach(el => {
    if (el) el.disabled = !isOwned;
  });
  if (emojiBtn) emojiBtn.disabled = !isOwned;

  // Populate store checkboxes
  const selectedStores = list?.stores || (list?.store ? [list.store] : []);
  populateDetailStoreCheckboxes(state.allStores, selectedStores);

  // Disable store checkboxes for non-owners
  const storeContainer = document.getElementById('detail-store-checkboxes');
  if (storeContainer && !isOwned) {
    storeContainer.querySelectorAll('input').forEach(i => i.disabled = true);
  }

  // Sync visibility toggle in detail panel (owner only)
  const vis = list?.visibility === 'public' ? 'public' : 'private';
  const toggle = document.getElementById('detail-visibility-toggle');
  if (toggle) {
    // Show/hide toggle based on ownership
    toggle.style.display = isOwned ? '' : 'none';
    toggle.querySelectorAll('.vis-toggle-btn').forEach(btn => {
      const active = btn.dataset.value === vis;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });

    // Wire click handler for detail-panel vis toggle
    toggle.onclick = async (e) => {
      const btn = e.target.closest('.vis-toggle-btn');
      if (!btn || !state.currentListId) return;
      const newVis = btn.dataset.value;
      try {
        await updateDoc(doc(listsCol(), state.currentListId), { visibility: newVis });
        toggle.querySelectorAll('.vis-toggle-btn').forEach(b => {
          const a = b.dataset.value === newVis;
          b.classList.toggle('active', a);
          b.setAttribute('aria-pressed', String(a));
        });
      } catch (err) {
        if (showToast) showToast('Error saving visibility: ' + err.message, 'error');
      }
    };
  }

  // Auto-save name on blur (owner only)
  if (nameInput && isOwned) {
    nameInput.onblur = async () => {
      const newName = nameInput.value.trim();
      if (!newName || !state.currentListId) return;
      if (newName === (state.allLists.find(l => l.id === state.currentListId)?.name || '')) return;
      try {
        await updateDoc(doc(listsCol(), state.currentListId), { name: newName });
        if (nameEl) nameEl.textContent = newName;
      } catch (e) { if (showToast) showToast('Error saving name: ' + e.message, 'error'); }
    };
    nameInput.onkeydown = (e) => { if (e.key === 'Enter') nameInput.blur(); };
  }

  // Auto-save description on blur (owner only)
  if (descInput && isOwned) {
    descInput.onblur = async () => {
      if (!state.currentListId) return;
      try {
        await updateDoc(doc(listsCol(), state.currentListId), { description: descInput.value.trim() });
      } catch (e) { if (showToast) showToast('Error saving description: ' + e.message, 'error'); }
    };
  }

  // Auto-save emoji via picker button (owner only)
  if (emojiBtn && openEmojiPicker && isOwned) {
    emojiBtn.onclick = () => openEmojiPicker('detail-list-emoji', 'detail-emoji-btn', async (picked) => {
      if (!state.currentListId) return;
      try {
        await updateDoc(doc(listsCol(), state.currentListId), { emoji: picked });
      } catch (e) { if (showToast) showToast('Error saving emoji: ' + e.message, 'error'); }
    });
  }

  // Auto-save stores on checkbox change (owner only)
  if (storeContainer && isOwned) {
    storeContainer.onchange = async () => {
      if (!state.currentListId) return;
      const stores = getDetailSelectedStores();
      try {
        await updateDoc(doc(listsCol(), state.currentListId), { stores });
      } catch (e) { if (showToast) showToast('Error saving stores: ' + e.message, 'error'); }
    };
  }

  navigateTo('list-detail');
  if (state.unsubItems) { state.unsubItems(); state.unsubItems = null; }
  state.unsubItems = onSnapshot(
    itemsCol(listId),
    snap => {
      state.allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderItems();
      updateListCounts(listId);
    },
    err => { if (err.code !== 'permission-denied') console.error(err); }
  );
}

// -- Update List Counts -------------------------------------------------------
export function updateListCounts(listId, { listsCol, updateDoc, doc }) {
  const total   = state.allItems.length;
  const checked = state.allItems.filter(i => i.checked).length;
  updateDoc(doc(listsCol(), listId), { itemCount: total, checkedCount: checked }).catch(() => {});
}
