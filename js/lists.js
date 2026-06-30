// js/lists.js
// Shopping list grid, list detail view, items rendering, and item modals.

import { db } from './firebase.js';
import {
  doc, addDoc, updateDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { escHtml, toArray, createIcons } from './utils.js';

// ── Lists grid ───────────────────────────────────────────────────────────────
export function renderLists(allLists, onOpen, onDelete) {
  const grid = document.getElementById('lists-grid');
  const q    = document.getElementById('search-lists').value.toLowerCase();
  const filtered = allLists.filter(l => l.name.toLowerCase().includes(q));
  document.getElementById('lists-subtitle').textContent = allLists.length === 1 ? '1 list' : `${allLists.length} lists`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-state-icon"><i data-lucide="shopping-cart"></i></div>
      <h3>${q ? 'No matching lists' : 'No lists yet'}</h3>
      <p>${q ? 'Try a different search.' : 'Create your first shopping list to get started.'}</p>
      ${!q ? '<button class="btn btn-primary" id="empty-new-list-btn"><i data-lucide="plus"></i> New List</button>' : ''}
    </div>`;
    document.getElementById('empty-new-list-btn')?.addEventListener('click', () => window.openModal('modal-new-list'));
    createIcons(); return;
  }

  grid.innerHTML = filtered.map(list => {
    const total = list.itemCount || 0, checked = list.checkedCount || 0;
    const pct   = total > 0 ? Math.round((checked / total) * 100) : 0;
    const storeName = list.storeName ? `<span>${list.storeName}</span>` : '';
    return `<div class="list-card" data-id="${list.id}">
      <div class="list-card-actions"><button class="icon-btn" data-delete-list="${list.id}" aria-label="Delete list" style="color:var(--color-error)"><i data-lucide="trash-2"></i></button></div>
      <div class="list-card-header"><div><div class="list-card-title">${escHtml(list.name)}</div><div class="list-card-meta">${storeName}<span>${total} item${total !== 1 ? 's' : ''}</span><span>${checked} checked</span></div></div></div>
      <div class="list-card-progress"><div class="list-card-progress-bar" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.list-card').forEach(card =>
    card.addEventListener('click', e => { if (e.target.closest('[data-delete-list]')) return; onOpen(card.dataset.id); })
  );
  grid.querySelectorAll('[data-delete-list]').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); onDelete('list', btn.dataset.deleteList); })
  );
  createIcons();
}

// ── List detail ───────────────────────────────────────────────────────────────
export function renderItems(allItems, onToggle, onEdit) {
  const list_  = document.getElementById('items-list');
  const empty  = document.getElementById('items-empty');
  const unchecked = allItems.filter(i => !i.checked);
  const checked   = allItems.filter(i =>  i.checked);
  const total = allItems.length, doneCount = checked.length;
  const pct   = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  document.getElementById('progress-bar').style.width      = pct + '%';
  document.getElementById('progress-label').textContent    = `${doneCount} of ${total} checked`;
  if (total === 0) { empty.style.display = 'flex'; list_.innerHTML = ''; return; }
  empty.style.display = 'none';

  const renderGroup = items => items.map(item => {
    const qty        = item.qty ? `<span class="item-qty-badge">${escHtml(item.qty)}${item.unit ? ' '+escHtml(item.unit) : ''}</span>` : '';
    const cat        = item.category ? `<span class="item-tag-chip"><i data-lucide="tag" style="width:10px;height:10px;"></i>${escHtml(item.category)}</span>` : '';
    const storeChips = toArray(item.stores).map(s => `<span class="item-store-chip"><i data-lucide="store" style="width:10px;height:10px;"></i>${escHtml(s)}</span>`).join('');
    const tagChips   = toArray(item.tags).map(t => `<span class="item-tag-chip">${escHtml(t)}</span>`).join('');
    const notes      = item.notes ? `<span style="color:var(--color-text-faint);font-size:var(--text-xs);">${escHtml(item.notes)}</span>` : '';
    const meta       = [qty, cat, storeChips, tagChips, notes].filter(Boolean).join('');
    return `<div class="item-row${item.checked ? ' checked' : ''}" data-item-id="${item.id}">
      <div class="item-checkbox${item.checked ? ' checked' : ''}" data-toggle="${item.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="item-info" style="flex:1;min-width:0;">
        <div class="item-name">${escHtml(item.name)}</div>
        ${meta ? `<div class="item-meta">${meta}</div>` : ''}
      </div>
      <button class="icon-btn item-edit" data-edit-item="${item.id}" aria-label="Edit item" title="Edit item" style="color:var(--color-text-muted);"><i data-lucide="pencil"></i></button>
    </div>`;
  }).join('');

  let html = unchecked.length > 0 ? renderGroup(unchecked) : '';
  if (checked.length > 0) html += `<div class="items-section-label">Checked (${checked.length})</div>` + renderGroup(checked);
  list_.innerHTML = html;
  list_.querySelectorAll('[data-toggle]').forEach(el     => el.addEventListener('click', () => onToggle(el.dataset.toggle)));
  list_.querySelectorAll('[data-edit-item]').forEach(btn => btn.addEventListener('click', () => onEdit(btn.dataset.editItem)));
  createIcons();
}

// ── Item store checkboxes ─────────────────────────────────────────────────────
export function populateItemStoreCheckboxes(allStores, selectedStores = []) {
  const container = document.getElementById('item-store-checkboxes');
  if (!container) return;
  if (allStores.length === 0) {
    container.innerHTML = `<span style="font-size:var(--text-xs);color:var(--color-text-faint);">No stores yet — add some in the Stores view.</span>`;
    return;
  }
  container.innerHTML = allStores.map(s =>
    `<label class="store-checkbox-label"><input type="checkbox" value="${escHtml(s.name)}" ${selectedStores.includes(s.name) ? 'checked' : ''}><span>${escHtml(s.name)}</span></label>`
  ).join('');
}

export function getSelectedStores() {
  return Array.from(
    document.getElementById('item-store-checkboxes')?.querySelectorAll('input[type=checkbox]:checked') || []
  ).map(cb => cb.value);
}

// ── Add/Edit item modal ───────────────────────────────────────────────────────
export function openAddItemModal(allStores, buildCategoryOptions, prefillName = '') {
  document.querySelector('#modal-add-item .modal-title').textContent = 'Add Item';
  document.getElementById('save-item-btn').innerHTML = '<i data-lucide="plus"></i> Add Item';
  document.getElementById('item-name-full').value = prefillName;
  document.getElementById('item-qty').value   = '';
  document.getElementById('item-unit').value  = '';
  document.getElementById('item-tags').value  = '';
  document.getElementById('item-notes').value = '';
  const catSel = document.getElementById('item-category');
  if (catSel) catSel.innerHTML = buildCategoryOptions('');
  populateItemStoreCheckboxes(allStores);
  window.openModal('modal-add-item');
  setTimeout(() => document.getElementById('item-name-full').focus(), 50);
}

export function openEditItemModal(itemId, allItems, allStores, buildCategoryOptions) {
  const item = allItems.find(i => i.id === itemId);
  if (!item) return null;
  document.querySelector('#modal-add-item .modal-title').textContent = 'Edit Item';
  document.getElementById('save-item-btn').innerHTML = '<i data-lucide="save"></i> Save Changes';
  document.getElementById('item-name-full').value = item.name;
  document.getElementById('item-qty').value   = item.qty   || '';
  document.getElementById('item-unit').value  = item.unit  || '';
  document.getElementById('item-tags').value  = toArray(item.tags).join(', ');
  document.getElementById('item-notes').value = item.notes || '';
  const catSel = document.getElementById('item-category');
  if (catSel) catSel.innerHTML = buildCategoryOptions(item.category || '');
  populateItemStoreCheckboxes(allStores, toArray(item.stores));
  window.openModal('modal-add-item');
  setTimeout(() => document.getElementById('item-name-full').focus(), 50);
  return itemId;
}

// ── Category options builder ─────────────────────────────────────────────────
export function buildCategoryOptions(allCategories, selectedCategory = '') {
  const blank = `<option value="">-- No category --</option>`;
  const opts  = allCategories.map(c =>
    `<option value="${escHtml(c.name)}" ${c.name === selectedCategory ? 'selected' : ''}>${c.emoji ? c.emoji + ' ' : ''}${escHtml(c.name)}</option>`
  ).join('');
  return blank + opts;
}
