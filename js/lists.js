// js/lists.js
import { state } from './state.js';
import { escHtml, createIcons } from './utils.js';

// -- Lists --------------------------------------------------------------------
export function renderLists(onOpen, onDelete) {
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
  grid.innerHTML = state.allLists.map(list => {
    const total   = list.itemCount   || 0;
    const checked = list.checkedCount || 0;
    const pct     = total > 0 ? Math.round((checked / total) * 100) : 0;
    const isPublic = list.visibility === 'public';
    const visBadge = isPublic
      ? `<span class="badge-shared"><i data-lucide="users" style="width:11px;height:11px;"></i> Public</span>`
      : `<span class="badge-shared" style="background:var(--color-surface-offset);color:var(--color-text-muted);"><i data-lucide="lock" style="width:11px;height:11px;"></i> Private</span>`;
    return `
    <div class="list-card" data-list-id="${list.id}">
      <div class="list-card-header">
        <div class="list-card-icon"><i data-lucide="shopping-cart"></i></div>
        <div class="list-card-actions">
          <button class="icon-btn" data-delete-list="${list.id}" aria-label="Delete list" style="color:var(--color-error);"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <h3 class="list-card-name">${escHtml(list.name)}</h3>
      <div class="list-card-meta">${total} item${total !== 1 ? 's' : ''} &middot; ${checked} done</div>
      <div class="progress-bar"><div class="progress-fill" style="width:${pct}%"></div></div>
      <div style="margin-top:var(--space-2);">${visBadge}</div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.list-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('[data-delete-list]')) return;
      onOpen(card.dataset.listId);
    });
  });
  grid.querySelectorAll('[data-delete-list]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      onDelete('list', btn.dataset.deleteList);
    });
  });
  createIcons();
}

// -- List Detail --------------------------------------------------------------
export function openList(listId, { navigateTo, setHashListId, onSnapshot, itemsCol, renderItems, updateListCounts }) {
  state.currentListId = listId;
  setHashListId(listId);
  const list = state.allLists.find(l => l.id === listId);
  const nameEl  = document.getElementById('detail-list-name');
  const storeEl = document.getElementById('detail-list-store');
  if (nameEl)  nameEl.textContent  = list ? list.name  : '';
  if (storeEl) storeEl.textContent = list ? (list.store || '') : '';

  // Sync visibility toggle to current list value
  const vis = list?.visibility === 'public' ? 'public' : 'private';
  const toggle = document.getElementById('detail-visibility-toggle');
  if (toggle) {
    toggle.querySelectorAll('.vis-toggle-btn').forEach(btn => {
      const active = btn.dataset.value === vis;
      btn.classList.toggle('active', active);
      btn.setAttribute('aria-pressed', String(active));
    });
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
