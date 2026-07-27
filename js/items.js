import { escHtml, toArray, createIcons } from './utils.js';
import { state } from './state.js';
import { applyItemFilters, buildFilterToolbarHTML, initFilterToolbar } from './item-filters.js';
import {
  doc, updateDoc, addDoc, deleteDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';

// -- Filter state for list detail ---------------------------------------------
const listFilterState = { search: '', category: '', store: '', sort: 'added' };
let _listFilterTeardown = null;

// -- Item Store Checkboxes ----------------------------------------------------
export function populateItemStoreCheckboxes(selectedStores = []) {
  const container = document.getElementById('item-store-checkboxes');
  if (!container) return;
  if (state.allStores.length === 0) {
    container.innerHTML = `<span style="font-size:var(--text-xs);color:var(--color-text-faint);">No stores yet - add some in the Stores view.</span>`;
    return;
  }
  container.innerHTML = state.allStores.map(s =>
    `<label class="store-checkbox-label"><input type="checkbox" value="${escHtml(s.name)}" ${selectedStores.includes(s.name) ? 'checked' : ''}><span>${escHtml(s.name)}</span></label>`
  ).join('');
}

export function getSelectedStores() {
  return Array.from(
    document.getElementById('item-store-checkboxes')?.querySelectorAll('input[type=checkbox]:checked') || []
  ).map(cb => cb.value);
}

// -- Render Items -------------------------------------------------------------
export function renderItems(onToggle, onEdit, onDelete) {
  const list_ = document.getElementById('items-list');
  const empty = document.getElementById('items-empty');
  const total = state.allItems.length, doneCount = state.allItems.filter(i => i.checked).length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `${doneCount} of ${total} checked`;

  // --- filter toolbar ---
  _renderListFilterToolbar(onToggle, onEdit, onDelete);

  if (total === 0) { empty.style.display = 'flex'; list_.innerHTML = ''; return; }
  empty.style.display = 'none';

  _renderItemList(onToggle, onEdit, onDelete);
}

function _renderListFilterToolbar(onToggle, onEdit, onDelete) {
  const wrap = document.getElementById('list-filter-toolbar-wrap');
  if (!wrap) return;

  // tear down previous listeners before re-rendering
  if (_listFilterTeardown) { _listFilterTeardown(); _listFilterTeardown = null; }

  wrap.innerHTML = buildFilterToolbarHTML('list', state.allCategories, state.allStores, listFilterState);
  createIcons();

  _listFilterTeardown = initFilterToolbar('list', (newState) => {
    Object.assign(listFilterState, newState);
    _renderItemList(onToggle, onEdit, onDelete);
    // update clear button presence without full toolbar re-render
    _refreshClearBtn('list', listFilterState, () => _renderListFilterToolbar(onToggle, onEdit, onDelete));
  }, listFilterState);
}

function _refreshClearBtn(prefix, filterState, rerender) {
  const toolbar = document.getElementById(`${prefix}-filter-toolbar`);
  if (!toolbar) return;
  const hasFilter = filterState.search || filterState.category || filterState.store || filterState.sort !== 'added';
  const existing  = document.getElementById(`${prefix}-filter-clear`);
  if (hasFilter && !existing) {
    // append clear button
    const btn = document.createElement('button');
    btn.className = 'item-filter-clear';
    btn.id = `${prefix}-filter-clear`;
    btn.setAttribute('aria-label', 'Clear filters');
    btn.title = 'Clear all filters';
    btn.innerHTML = '<i data-lucide="x"></i> Clear';
    btn.addEventListener('click', () => {
      filterState.search = ''; filterState.category = ''; filterState.store = ''; filterState.sort = 'added';
      rerender();
    });
    toolbar.appendChild(btn);
    createIcons();
  } else if (!hasFilter && existing) {
    existing.remove();
  }
}

function _renderItemList(onToggle, onEdit, onDelete) {
  const list_ = document.getElementById('items-list');
  const empty = document.getElementById('items-empty');
  if (!list_) return;

  const filtered = applyItemFilters(state.allItems, listFilterState);
  const unchecked = filtered.filter(i => !i.checked);
  const checked   = filtered.filter(i =>  i.checked);

  if (filtered.length === 0 && state.allItems.length > 0) {
    empty.style.display = 'flex';
    empty.querySelector('h3').textContent = 'No items match';
    empty.querySelector('p').innerHTML    = 'Try adjusting your filters.';
    list_.innerHTML = '';
    return;
  }
  if (state.allItems.length === 0) {
    empty.style.display = 'flex';
    empty.querySelector('h3').textContent = 'List is empty';
    empty.querySelector('p').innerHTML    = 'Tap <strong>Add Item</strong> to get started.';
    list_.innerHTML = '';
    return;
  }
  empty.style.display = 'none';

  const renderGroup = items => items.map(item => {
    const qty        = item.qty ? `<span class="item-qty-badge">${escHtml(item.qty)}${item.unit ? ' '+escHtml(item.unit) : ''}</span>` : '';
    const catObj     = state.allCategories.find(c => c.name === (item.category || ''));
    const cat        = item.category ? `<span class="item-tag-chip" title="${escHtml(item.category)}">${catObj?.emoji || '\uD83C\uDFF7\uFE0F'}</span>` : '';
    const storeChips = toArray(item.stores).map(s => `<span class="item-store-chip"><i data-lucide="store" style="width:10px;height:10px;"></i>${escHtml(s)}</span>`).join('');
    const tagChips   = toArray(item.tags).map(t => `<span class="item-tag-chip">${escHtml(t)}</span>`).join('');
    const notes      = item.notes ? `<span style="color:var(--color-text-faint);font-size:var(--text-xs);">${escHtml(item.notes)}</span>` : '';
    const snapBadge  = item.snapEligible ? '<span class="snap-badge">SNAP</span>' : '';
    const meta       = [qty, cat, storeChips, tagChips, snapBadge, notes].filter(Boolean).join('');
    return `<div class="item-row${item.checked ? ' checked' : ''}" data-item-id="${item.id}">
      <div class="item-checkbox${item.checked ? ' checked' : ''}" data-toggle="${item.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="item-info" style="flex:1;min-width:0;">
        <div class="item-name">${escHtml(item.name)}</div>
        ${meta ? `<div class="item-meta">${meta}</div>` : ''}
      </div>
      <button class="icon-btn item-edit" data-edit-item="${item.id}" aria-label="Edit item" title="Edit item" style="color:var(--color-text-muted);"><i data-lucide="pencil"></i></button>
      <button class="icon-btn item-delete" data-delete-item="${item.id}" aria-label="Delete item" title="Delete item" style="color:var(--color-error);"><i data-lucide="trash-2"></i></button>
    </div>`;
  }).join('');

  let html = unchecked.length > 0 ? renderGroup(unchecked) : '';
  if (checked.length > 0) html += `<div class="items-section-label">Checked (${checked.length})</div>` + renderGroup(checked);
  list_.innerHTML = html;
  list_.querySelectorAll('[data-toggle]').forEach(el      => el.addEventListener('click', () => onToggle(el.dataset.toggle)));
  list_.querySelectorAll('[data-edit-item]').forEach(btn  => btn.addEventListener('click', e => { e.stopPropagation(); onEdit(btn.dataset.editItem); }));
  list_.querySelectorAll('[data-delete-item]').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); onDelete(btn.dataset.deleteItem); }));
  createIcons();
}

// -- Add / Edit Item Modals ---------------------------------------------------
export function openAddItemModal(buildCategoryOptions) {
  if (!state.currentListId) { window.showToast('No list selected - please open a list first', 'error'); return; }
  state.editingItemId = null;
  document.querySelector('#modal-add-item .modal-title').textContent = 'Add Item';
  document.getElementById('save-item-btn').innerHTML = '<i data-lucide="plus"></i> Add Item';
  document.getElementById('delete-item-btn').style.display = 'none';
  document.getElementById('item-name-full').value = '';
  document.getElementById('item-qty').value   = '';
  document.getElementById('item-unit').value  = '';
  document.getElementById('item-notes').value = '';
  const catSel = document.getElementById('item-category');
  if (catSel) catSel.innerHTML = buildCategoryOptions('');
  populateItemStoreCheckboxes();
  window.openModal('modal-add-item');
  setTimeout(() => document.getElementById('item-name-full').focus(), 50);
}

export function openEditItemModal(itemId, buildCategoryOptions) {
  const item = state.allItems.find(i => i.id === itemId);
  if (!item) return;
  state.editingItemId = itemId;
  document.querySelector('#modal-add-item .modal-title').textContent = 'Edit Item';
  document.getElementById('save-item-btn').innerHTML = '<i data-lucide="save"></i> Save Changes';
  document.getElementById('delete-item-btn').style.display = 'inline-flex';
  document.getElementById('item-name-full').value = item.name  || '';
  document.getElementById('item-qty').value        = item.qty   || '';
  document.getElementById('item-unit').value       = item.unit  || '';
  document.getElementById('item-notes').value      = item.notes || '';
  const snapCbItem = document.getElementById('item-snap-eligible');
  if (snapCbItem) snapCbItem.checked = !!item.snapEligible;
  const catSel = document.getElementById('item-category');
  if (catSel) catSel.innerHTML = buildCategoryOptions(item.category || '');
  populateItemStoreCheckboxes(toArray(item.stores));
  window.openModal('modal-add-item');
  setTimeout(() => document.getElementById('item-name-full').focus(), 50);
}

// -- Toggle Item --------------------------------------------------------------
export async function toggleItem(itemId, { itemsCol }) {
  const item = state.allItems.find(i => i.id === itemId);
  if (!item || !state.currentListId) return;
  try {
    await updateDoc(doc(itemsCol(state.currentListId), itemId), { checked: !item.checked });
  } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
}

// -- Delete Item --------------------------------------------------------------
export async function deleteItem({ itemsCol }) {
  const itemId = state.editingItemId;
  if (!itemId || !state.currentListId) return;
  try {
    await deleteDoc(doc(itemsCol(state.currentListId), itemId));
    window.closeModal('modal-add-item');
    state.editingItemId = null;
    window.showToast('Item deleted', 'success');
  } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
}

// -- Delete Item by ID (called from confirm dialog) ---------------------------
export async function deleteItemById(itemId, { itemsCol }) {
  if (!itemId || !state.currentListId) return;
  try {
    await deleteDoc(doc(itemsCol(state.currentListId), itemId));
    window.showToast('Item deleted', 'success');
  } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
}

// -- Save Item (add OR edit) --------------------------------------------------
// templatesCol and tplUpdateDoc are optional — passed from app.js to support
// auto-saving the active template when a new item is added from the list view.
export async function saveItem({ itemsCol, getSelectedStores: getStores, templatesCol, tplUpdateDoc, tplDoc }) {
  const name = document.getElementById('item-name-full').value.trim();
  if (!name) { window.showToast('Item name is required', 'error'); return; }
  if (!state.currentListId) { window.showToast('No list selected', 'error'); return; }
  const data = {
    name,
    qty:      document.getElementById('item-qty').value.trim(),
    unit:     document.getElementById('item-unit').value.trim(),
    category: document.getElementById('item-category').value,
    stores:   getStores(),
    notes:    document.getElementById('item-notes').value.trim(),
    snapEligible: !!(document.getElementById('item-snap-eligible')?.checked)
  };
  try {
    if (state.editingItemId) {
      await updateDoc(doc(itemsCol(state.currentListId), state.editingItemId), data);
      window.showToast('Item updated!', 'success');
    } else {
      await addDoc(itemsCol(state.currentListId), { ...data, checked: false, createdAt: serverTimestamp() });
      // Auto-save to active template if one is open in the editor
      if (state.editingTemplateId && templatesCol && tplUpdateDoc && tplDoc) {
        const tplItem = {
          name:     data.name,
          qty:      data.qty,
          unit:     data.unit,
          category: data.category,
          stores:   data.stores,
          tags:     [],
          notes:    data.notes
        };
        state.tplEditorItems.push(tplItem);
        try {
          await tplUpdateDoc(tplDoc(templatesCol(), state.editingTemplateId), { items: state.tplEditorItems });
          window.showToast('Item added & template saved!', 'success');
        } catch (tplErr) {
          // Item was saved to the list; template save failing is non-fatal
          window.showToast('Item added (template save failed: ' + tplErr.message + ')', 'error');
        }
      } else {
        window.showToast('Item added!', 'success');
      }
    }
    window.closeModal('modal-add-item');
    state.editingItemId = null;
    ['item-name-full','item-qty','item-unit','item-notes'].forEach(id => document.getElementById(id).value = '');
  } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
}
