import { escHtml, toArray, createIcons } from './utils.js';
import { state } from './state.js';
import { navigateTo } from './nav.js';
import { openEmojiPicker } from './ui.js';

// -- Helpers ------------------------------------------------------------------
export function normaliseItem(it) {
  if (typeof it === 'string') return { name: it, qty: '', unit: '', category: '', stores: [], tags: [], notes: '' };
  return {
    name:     it.name     || '',
    qty:      it.qty      || '',
    unit:     it.unit     || '',
    category: it.category || '',
    stores:   toArray(it.stores),
    tags:     toArray(it.tags),
    notes:    it.notes    || ''
  };
}

function populateTplItemStoreCheckboxes(selectedStores = []) {
  const container = document.getElementById('tpl-item-store-checkboxes');
  if (!container) return;
  if (state.allStores.length === 0) {
    container.innerHTML = `<span style="font-size:var(--text-xs);color:var(--color-text-faint);">No stores yet - add some in the Stores view.</span>`;
    return;
  }
  container.innerHTML = state.allStores.map(s =>
    `<label class="store-checkbox-label"><input type="checkbox" value="${escHtml(s.name)}" ${selectedStores.includes(s.name) ? 'checked' : ''}><span>${escHtml(s.name)}</span></label>`
  ).join('');
}

function getTplItemSelectedStores() {
  return Array.from(
    document.getElementById('tpl-item-store-checkboxes')?.querySelectorAll('input[type=checkbox]:checked') || []
  ).map(cb => cb.value);
}

// -- Template-level store pills -----------------------------------------------
function populateTplStoreCheckboxes(selectedStores = []) {
  const container = document.getElementById('tpl-store-checkboxes');
  if (!container) return;
  if (state.allStores.length === 0) {
    container.innerHTML = `<span style="font-size:var(--text-xs);color:var(--color-text-faint);">No stores yet - add some in the Stores view.</span>`;
    return;
  }
  container.innerHTML = state.allStores.map(s =>
    `<label class="store-checkbox-label"><input type="checkbox" value="${escHtml(s.name)}" ${selectedStores.includes(s.name) ? 'checked' : ''}><span>${escHtml(s.name)}</span></label>`
  ).join('');
}

function getTplSelectedStores() {
  return Array.from(
    document.getElementById('tpl-store-checkboxes')?.querySelectorAll('input[type=checkbox]:checked') || []
  ).map(cb => cb.value);
}

// -- Visibility toggle --------------------------------------------------------
function getVisibilityValue() {
  const active = document.querySelector('#tpl-visibility .vis-toggle-btn.active');
  return active?.dataset.value || 'private';
}

function setVisibilityValue(val) {
  document.querySelectorAll('#tpl-visibility .vis-toggle-btn').forEach(btn => {
    const isActive = btn.dataset.value === val;
    btn.classList.toggle('active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

function initVisibilityToggle() {
  document.querySelectorAll('#tpl-visibility .vis-toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => setVisibilityValue(btn.dataset.value));
  });
}

// -- Emoji Picker -------------------------------------------------------------
function initEmojiPicker() {
  const btn = document.getElementById('tpl-emoji-btn');
  if (!btn) return;
  btn.addEventListener('click', () =>
    openEmojiPicker('tpl-emoji', 'tpl-emoji-btn')
  );
}

export function setEmojiPickerValue(emoji) {
  const btn    = document.getElementById('tpl-emoji-btn');
  const hidden = document.getElementById('tpl-emoji');
  if (btn)    btn.textContent = emoji || '\uD83D\uDED2';
  if (hidden) hidden.value   = emoji || '';
}

// -- Move/Copy toolbar button enable state ------------------------------------
// Now operates on the inline button rendered inside tpl-select-all-row
export function updateMoveItemsBtn() {
  const btn = document.getElementById('tpl-move-items-btn');
  if (!btn) return;
  const checked = document.querySelectorAll('#tpl-editor-items input.tpl-item-select:not(#tpl-select-all):checked').length;
  btn.disabled = checked === 0;
}

// -- Move / Copy items modal --------------------------------------------------
export function openMoveToTemplateModal() {
  const items = getCheckedTplItems();
  if (items.length === 0) { window.showToast('No items selected \u2014 check at least one item first', 'error'); return; }

  const others = state.allTemplates.filter(t => t.id !== state.editingTemplateId);
  if (others.length === 0) { window.showToast('No other templates to move items to', 'error'); return; }

  const select = document.getElementById('tpl-move-select');
  if (select) {
    select.innerHTML = others.map(t =>
      `<option value="${escHtml(t.id)}">${escHtml(t.emoji || '\uD83D\uDCCB')} ${escHtml(t.name)}</option>`
    ).join('');
  }

  const summary = document.getElementById('tpl-move-summary');
  if (summary) {
    summary.textContent = `${items.length} item${items.length !== 1 ? 's' : ''} selected. Choose a destination template, then Move or Copy.`;
  }

  window.openModal('modal-tpl-move');
}

export async function executeMoveCopy({ mode, updateDoc, doc, templatesCol, buildCategoryOptions }) {
  const checkedCbs = Array.from(
    document.getElementById('tpl-editor-items')?.querySelectorAll('input[type=checkbox].tpl-item-select:not(#tpl-select-all):checked') || []
  );
  const checkedIndexes = checkedCbs.map(cb => parseInt(cb.dataset.idx));
  const items = checkedIndexes.map(i => state.tplEditorItems[i]);

  if (items.length === 0) { window.showToast('No items selected', 'error'); return; }

  const destId = document.getElementById('tpl-move-select')?.value;
  if (!destId) { window.showToast('No destination template selected', 'error'); return; }

  const destTpl = state.allTemplates.find(t => t.id === destId);
  if (!destTpl) { window.showToast('Destination template not found', 'error'); return; }

  const destItems = (destTpl.items || []).map(normaliseItem);
  const newDestItems = [...destItems, ...items];

  try {
    await updateDoc(doc(templatesCol(), destId), { items: newDestItems });

    if (mode === 'move') {
      const sorted = [...checkedIndexes].sort((a, b) => b - a);
      sorted.forEach(i => state.tplEditorItems.splice(i, 1));
      if (state.editingTemplateId) {
        await updateDoc(doc(templatesCol(), state.editingTemplateId), { items: state.tplEditorItems });
      }
    }

    window.closeModal('modal-tpl-move');
    renderTplEditorItems({ buildCategoryOptions });
    const verb = mode === 'move' ? 'Moved' : 'Copied';
    window.showToast(`${verb} ${items.length} item${items.length !== 1 ? 's' : ''} to \u201c${destTpl.name}\u201d`, 'success');
  } catch (e) {
    window.showToast('Error: ' + e.message, 'error');
  }
}

// -- Add-to-List picker modal -------------------------------------------------
export function openAddToListModal() {
  const items = getCheckedTplItems();
  if (items.length === 0) { window.showToast('No items selected - check at least one item first', 'error'); return; }

  const select = document.getElementById('tpl-list-select');
  const newRow  = document.getElementById('tpl-new-list-row');
  const newInput = document.getElementById('tpl-new-list-name');

  if (select) {
    select.innerHTML = state.allLists.map(l =>
      `<option value="${escHtml(l.id)}">${escHtml(l.name)}</option>`
    ).join('') + `<option value="__new__">+ Create New List</option>`;

    const toggle = () => {
      const isNew = select.value === '__new__';
      newRow.style.display = isNew ? '' : 'none';
      if (isNew) setTimeout(() => newInput.focus(), 50);
    };
    select.onchange = toggle;
    select.value = state.allLists.length > 0 ? state.allLists[0].id : '__new__';
    toggle();
  }

  if (newInput) newInput.value = '';
  window.openModal('modal-tpl-add-to-list');
}

function getCheckedTplItems() {
  return Array.from(
    document.getElementById('tpl-editor-items')?.querySelectorAll('input[type=checkbox].tpl-item-select:checked') || []
  ).map(cb => state.tplEditorItems[parseInt(cb.dataset.idx)]);
}

export async function addSelectedItemsToList({ listsCol, itemsCol, addDoc, writeBatch, doc, serverTimestamp, db }) {
  const items = getCheckedTplItems();
  if (items.length === 0) { window.showToast('No items selected', 'error'); return; }

  const select = document.getElementById('tpl-list-select');
  if (!select) { window.showToast('Could not find list selector', 'error'); return; }
  let listId = select.value;

  if (listId === '__new__') {
    const newName = document.getElementById('tpl-new-list-name').value.trim();
    if (!newName) { window.showToast('Please enter a name for the new list', 'error'); return; }
    try {
      const ref = await addDoc(listsCol(), {
        name: newName,
        visibility: 'private',
        createdAt: serverTimestamp(),
        itemCount: 0
      });
      listId = ref.id;
    } catch (e) { window.showToast('Error creating list: ' + e.message, 'error'); return; }
  }

  try {
    const batch = writeBatch(db);
    items.forEach(it => {
      const ref = doc(itemsCol(listId));
      batch.set(ref, { ...it, checked: false, createdAt: serverTimestamp() });
    });
    await batch.commit();
    window.showToast(`${items.length} item${items.length !== 1 ? 's' : ''} added to list!`, 'success');
    window.closeModal('modal-tpl-add-to-list');
    navigateTo('templates');
  } catch (e) { window.showToast('Error adding items: ' + e.message, 'error'); }
}

// -- Render grid --------------------------------------------------------------
export function renderTemplates(onEdit) {
  const grid = document.getElementById('templates-grid');
  if (!grid) return;
  if (state.allTemplates.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><i data-lucide="layout-template"></i></div><h3>No templates yet</h3><p>Create a template to quickly start new lists.</p></div>`;
    createIcons(); return;
  }
  grid.innerHTML = state.allTemplates.map(t => {
    const items   = t.items || [];
    const preview = items.slice(0, 5);
    const more    = items.length - preview.length;
    const chips   = preview.map(it => {
      const cat    = state.allCategories.find(c => c.name === (it.category || ''));
      const prefix = cat?.emoji ? cat.emoji + ' ' : '';
      return `<span class="template-item-chip">${prefix}${escHtml(it.name || it)}</span>`;
    }).join('');
    const moreChip = more > 0 ? `<span class="template-item-chip">+${more} more</span>` : '';
    return `<div class="template-card" data-tpl-id="${t.id}" style="cursor:pointer;" title="Edit template">
      <div class="template-card-emoji">${t.emoji || '\uD83D\uDCCB'}</div>
      <div><div class="template-card-title">${escHtml(t.name)}</div><div class="template-card-desc">${escHtml(t.desc || '')}</div></div>
      <div class="template-card-items">${chips}${moreChip}</div>
      <div class="template-card-footer"><span class="template-item-count">${items.length} item${items.length !== 1 ? 's' : ''}</span></div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.template-card').forEach(card =>
    card.addEventListener('click', () => onEdit(card.dataset.tplId))
  );
  createIcons();
}

// -- Editor -------------------------------------------------------------------
export function openTemplateEditor(tplId, { buildCategoryOptions }) {
  state.editingTemplateId = tplId || null;
  const tpl = tplId ? state.allTemplates.find(t => t.id === tplId) : null;
  document.getElementById('tpl-editor-title').textContent = tpl ? tpl.name : 'New Template';
  setEmojiPickerValue(tpl ? (tpl.emoji || '') : '');
  document.getElementById('tpl-name').value                   = tpl ? tpl.name          : '';
  document.getElementById('tpl-desc').value                   = tpl ? (tpl.desc  || '') : '';
  document.getElementById('tpl-delete-btn').style.display     = tpl ? 'inline-flex' : 'none';
  setVisibilityValue(tpl ? (tpl.visibility || 'private') : 'private');
  populateTplStoreCheckboxes(tpl ? toArray(tpl.stores) : []);
  state.tplEditorItems = tpl ? (tpl.items || []).map(normaliseItem) : [];
  renderTplEditorItems({ buildCategoryOptions });
  navigateTo('template-editor');
}

export function renderTplEditorItems({ buildCategoryOptions } = {}) {
  const container = document.getElementById('tpl-editor-items');
  if (!container) return;
  const count = state.tplEditorItems.length;
  document.getElementById('tpl-item-count').textContent = `${count} item${count !== 1 ? 's' : ''}`;

  if (count === 0) {
    container.innerHTML = `<div class="empty-state" style="padding:var(--space-8) var(--space-4);"><div class="empty-state-icon"><i data-lucide="package-open"></i></div><p style="color:var(--color-text-muted);">No items yet. Add your first item below.</p></div>`;
    updateMoveItemsBtn();
    createIcons(); return;
  }

  container.innerHTML = `
    <div class="tpl-select-all-row" style="display:flex;align-items:center;justify-content:space-between;">
      <label class="tpl-select-all-label" id="tpl-select-all-label">
        <input type="checkbox" id="tpl-select-all" class="tpl-item-select">
        <span>Select all</span>
      </label>
      <button class="btn btn-ghost btn-sm" id="tpl-move-items-btn" disabled>
        <i data-lucide="arrow-right-left"></i> Move to Template
      </button>
    </div>
    ${state.tplEditorItems.map((it, i) => {
      const cat    = state.allCategories.find(c => c.name === (it.category || ''));
      const catBadge = it.category
        ? `<span class="item-cat-badge">${cat?.emoji ? cat.emoji + ' ' : ''}${escHtml(it.category)}</span>`
        : '';
      const storesBadge = it.stores?.length
        ? `<span class="item-cat-badge" style="background:var(--color-blue-highlight);color:var(--color-blue);">${escHtml(it.stores.join(', '))}</span>`
        : '';
      const qty = it.qty ? `<span class="tpl-item-qty">${escHtml(it.qty)}${it.unit ? ' ' + escHtml(it.unit) : ''}</span>` : '';
      return `<div class="tpl-editor-item-row" data-tpl-item-idx="${i}">
        <input type="checkbox" class="tpl-item-select" data-idx="${i}" aria-label="Select ${escHtml(it.name)}">
        <div class="tpl-item-info">
          <span class="tpl-item-name">${escHtml(it.name)}</span>${qty}
          <div class="tpl-item-badges">${catBadge}${storesBadge}</div>
        </div>
        <div class="tpl-item-actions">
          <button class="icon-btn" data-tpl-item-edit="${i}" aria-label="Edit item"><i data-lucide="pencil"></i></button>
          <button class="icon-btn" data-tpl-item-remove="${i}" aria-label="Remove item"><i data-lucide="trash-2"></i></button>
        </div>
      </div>`;
    }).join('')}`;

  const selectAllCb    = document.getElementById('tpl-select-all');
  const selectAllLabel = document.getElementById('tpl-select-all-label');
  const itemCbs        = () => container.querySelectorAll('input.tpl-item-select:not(#tpl-select-all)');

  function updateSelectAllState() {
    const all     = itemCbs();
    const checked = Array.from(all).filter(cb => cb.checked);
    const checkedCount = checked.length;
    if (checkedCount === 0) {
      selectAllCb.checked = false;
      selectAllCb.indeterminate = false;
    } else if (checkedCount === all.length) {
      selectAllCb.checked = true;
      selectAllCb.indeterminate = false;
    } else {
      selectAllCb.checked = false;
      selectAllCb.indeterminate = true;
    }
    updateMoveItemsBtn();
  }

  selectAllCb.addEventListener('change', () => {
    itemCbs().forEach(cb => { cb.checked = selectAllCb.checked; });
    updateSelectAllState();
  });
  selectAllLabel.addEventListener('click', () => {
    selectAllCb.checked = !selectAllCb.checked;
    selectAllCb.dispatchEvent(new Event('change'));
  });

  container.querySelectorAll('input.tpl-item-select').forEach(cb =>
    cb.addEventListener('change', updateSelectAllState)
  );

  // Wire the inline Move to Template button
  document.getElementById('tpl-move-items-btn')?.addEventListener('click', openMoveToTemplateModal);

  container.querySelectorAll('[data-tpl-item-edit]').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); openTplItemModal(parseInt(btn.dataset.tplItemEdit), { buildCategoryOptions }); })
  );
  container.querySelectorAll('[data-tpl-item-remove]').forEach(btn =>
    btn.addEventListener('click', e => {
      e.stopPropagation();
      state.tplEditorItems.splice(parseInt(btn.dataset.tplItemRemove), 1);
      renderTplEditorItems({ buildCategoryOptions });
    })
  );
  container.querySelectorAll('[data-tpl-item-idx]').forEach(row =>
    row.addEventListener('click', e => {
      if (e.target.closest('button') || e.target.classList.contains('tpl-item-select')) return;
      openTplItemModal(parseInt(row.dataset.tplItemIdx), { buildCategoryOptions });
    })
  );

  updateMoveItemsBtn();
  createIcons();
}

// -- Template Item sub-modal --------------------------------------------------
export function openTplItemModal(idx, { buildCategoryOptions } = {}) {
  state.tplItemEditingIdx = idx;
  const it = idx >= 0 ? state.tplEditorItems[idx] : null;
  document.getElementById('tpl-item-modal-title').textContent = it ? 'Edit Item' : 'Add Item';
  document.getElementById('tpl-item-name').value              = it ? it.name  : '';
  document.getElementById('tpl-item-qty').value               = it ? it.qty   : '';
  document.getElementById('tpl-item-unit').value              = it ? it.unit  : '';
  document.getElementById('tpl-item-tags').value              = it ? toArray(it.tags).join(', ') : '';
  document.getElementById('tpl-item-notes').value             = it ? it.notes : '';
  const tplCatSel = document.getElementById('tpl-item-category');
  if (tplCatSel && buildCategoryOptions) tplCatSel.innerHTML = buildCategoryOptions(it ? it.category : '');
  populateTplItemStoreCheckboxes(it ? toArray(it.stores) : []);
  window.openModal('modal-tpl-item');
  setTimeout(() => document.getElementById('tpl-item-name').focus(), 50);
}
window.closeTplItemModal = () => window.closeModal('modal-tpl-item');

export function saveTplItem({ buildCategoryOptions } = {}) {
  const name = document.getElementById('tpl-item-name').value.trim();
  if (!name) { window.showToast('Item name is required', 'error'); return; }
  const item = {
    name,
    qty:      document.getElementById('tpl-item-qty').value.trim(),
    unit:     document.getElementById('tpl-item-unit').value.trim(),
    category: document.getElementById('tpl-item-category').value,
    stores:   getTplItemSelectedStores(),
    tags:     document.getElementById('tpl-item-tags').value.split(',').map(s => s.trim()).filter(Boolean),
    notes:    document.getElementById('tpl-item-notes').value.trim()
  };
  if (state.tplItemEditingIdx >= 0) {
    state.tplEditorItems[state.tplItemEditingIdx] = item;
  } else {
    state.tplEditorItems.push(item);
  }
  window.closeModal('modal-tpl-item');
  renderTplEditorItems({ buildCategoryOptions });
}

// -- initTemplates - wires all template UI listeners -------------------------
export function initTemplates({ templatesCol, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, buildCategoryOptions, confirmDelete,
                                 listsCol, itemsCol, writeBatch, db }) {

  initEmojiPicker();
  initVisibilityToggle();

  document.getElementById('new-template-btn').addEventListener('click', () =>
    openTemplateEditor(null, { buildCategoryOptions })
  );

  document.getElementById('back-to-templates').addEventListener('click', () =>
    navigateTo('templates')
  );

  document.getElementById('tpl-add-item-btn').addEventListener('click', () =>
    openTplItemModal(-1, { buildCategoryOptions })
  );

  document.getElementById('tpl-item-save-btn').addEventListener('click', () =>
    saveTplItem({ buildCategoryOptions })
  );
  document.getElementById('tpl-item-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') saveTplItem({ buildCategoryOptions });
  });

  document.getElementById('tpl-save-btn').addEventListener('click', async () => {
    const name = document.getElementById('tpl-name').value.trim();
    if (!name) { window.showToast('Template name is required', 'error'); return; }
    const data = {
      name,
      emoji:      document.getElementById('tpl-emoji').value.trim() || '\uD83D\uDED2',
      desc:       document.getElementById('tpl-desc').value.trim(),
      stores:     getTplSelectedStores(),
      items:      state.tplEditorItems,
      visibility: getVisibilityValue(),
      updatedAt:  serverTimestamp()
    };
    try {
      if (state.editingTemplateId) {
        await updateDoc(doc(templatesCol(), state.editingTemplateId), data);
        window.showToast('Template saved!', 'success');
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(templatesCol(), data);
        window.showToast(`"${name}" template created!`, 'success');
      }
      navigateTo('templates');
    } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
  });

  document.getElementById('tpl-add-to-list-btn').addEventListener('click', openAddToListModal);

  document.getElementById('tpl-atl-confirm-btn').addEventListener('click', () =>
    addSelectedItemsToList({ listsCol, itemsCol, addDoc, writeBatch, doc, serverTimestamp, db })
  );

  document.getElementById('tpl-move-move-btn').addEventListener('click', () =>
    executeMoveCopy({ mode: 'move', updateDoc, doc, templatesCol, buildCategoryOptions })
  );

  document.getElementById('tpl-move-copy-btn').addEventListener('click', () =>
    executeMoveCopy({ mode: 'copy', updateDoc, doc, templatesCol, buildCategoryOptions })
  );

  document.getElementById('tpl-delete-btn').addEventListener('click', () => {
    if (!state.editingTemplateId) return;
    navigateTo('templates');
    confirmDelete('template', state.editingTemplateId, () => {});
  });
}
