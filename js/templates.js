import { escHtml, toArray, createIcons } from './utils.js';
import { state } from './state.js';

// ── Helpers ──────────────────────────────────────────────────────────────────
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
    container.innerHTML = `<span style="font-size:var(--text-xs);color:var(--color-text-faint);">No stores yet — add some in the Stores view.</span>`;
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

// ── Add-to-List picker modal ────────────────────────────────────────────────────
export function openAddToListModal() {
  const items = getCheckedTplItems();
  if (items.length === 0) { window.showToast('No items selected — check at least one item first', 'error'); return; }

  const select = document.getElementById('tpl-list-select');
  const newRow  = document.getElementById('tpl-new-list-row');
  const newInput = document.getElementById('tpl-new-list-name');

  if (select) {
    select.innerHTML = state.allLists.map(l =>
      `<option value="${escHtml(l.id)}">${escHtml(l.name)}</option>`
    ).join('') + `<option value="__new__">➕ Create New List</option>`;

    // Show/hide new-list name field
    const toggle = () => {
      const isNew = select.value === '__new__';
      newRow.style.display = isNew ? '' : 'none';
      if (isNew) setTimeout(() => newInput.focus(), 50);
    };
    select.onchange = toggle;
    // Default: first list selected, new-list row hidden
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

  // Create new list if needed
  if (listId === '__new__') {
    const newName = document.getElementById('tpl-new-list-name').value.trim();
    if (!newName) { window.showToast('Please enter a name for the new list', 'error'); return; }
    try {
      const ref = await addDoc(listsCol(), { name: newName, createdAt: serverTimestamp(), itemCount: 0 });
      listId = ref.id;
    } catch (e) { window.showToast('Error creating list: ' + e.message, 'error'); return; }
  }

  // Batch-write items to the chosen list
  try {
    const batch = writeBatch(db);
    items.forEach(it => {
      const ref = doc(itemsCol(listId));
      batch.set(ref, { ...it, checked: false, createdAt: serverTimestamp() });
    });
    await batch.commit();
    window.showToast(`${items.length} item${items.length !== 1 ? 's' : ''} added to list!`, 'success');
    window.closeModal('modal-tpl-add-to-list');
    window.closeModal('modal-template-editor');
  } catch (e) { window.showToast('Error adding items: ' + e.message, 'error'); }
}

// ── Render grid ──────────────────────────────────────────────────────────────
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

// ── Editor ───────────────────────────────────────────────────────────────────
export function openTemplateEditor(tplId, { buildCategoryOptions }) {
  state.editingTemplateId = tplId || null;
  const tpl = tplId ? state.allTemplates.find(t => t.id === tplId) : null;
  document.getElementById('tpl-editor-title').textContent     = tpl ? 'Template' : 'New Template';
  document.getElementById('tpl-emoji').value                  = tpl ? (tpl.emoji || '') : '';
  document.getElementById('tpl-name').value                   = tpl ? tpl.name          : '';
  document.getElementById('tpl-desc').value                   = tpl ? (tpl.desc  || '') : '';
  document.getElementById('tpl-delete-btn').style.display     = tpl ? 'inline-flex' : 'none';
  state.tplEditorItems = tpl ? (tpl.items || []).map(normaliseItem) : [];
  renderTplEditorItems({ buildCategoryOptions });
  window.openModal('modal-template-editor');
}

export function renderTplEditorItems({ buildCategoryOptions } = {}) {
  const container = document.getElementById('tpl-editor-items');
  if (!container) return;
  const count = state.tplEditorItems.length;
  document.getElementById('tpl-item-count').textContent = `${count} item${count !== 1 ? 's' : ''}`;
  if (count === 0) {
    container.innerHTML = `<div style="font-size:var(--text-xs);color:var(--color-text-faint);text-align:center;padding:var(--space-4) var(--space-2);">No items yet — click "Add Item" below</div>`;
    return;
  }
  container.innerHTML = state.tplEditorItems.map((it, i) => {
    const qty   = it.qty  ? `<span class="item-qty-badge">${escHtml(it.qty)}${it.unit ? ' '+escHtml(it.unit) : ''}</span>` : '';
    const cat   = it.category ? `<span class="item-tag-chip"><i data-lucide="tag" style="width:10px;height:10px;"></i>${escHtml(it.category)}</span>` : '';
    const store = toArray(it.stores).map(s => `<span class="item-store-chip"><i data-lucide="store" style="width:10px;height:10px;"></i>${escHtml(s)}</span>`).join('');
    const tags  = toArray(it.tags).map(t => `<span class="item-tag-chip">${escHtml(t)}</span>`).join('');
    const notes = it.notes ? `<span style="color:var(--color-text-faint);font-size:var(--text-xs);">${escHtml(it.notes)}</span>` : '';
    const meta  = [qty, cat, store, tags, notes].filter(Boolean).join('');
    return `<div class="item-row" data-tpl-item-idx="${i}" style="cursor:pointer;" title="Click to edit">
      <input type="checkbox" class="tpl-item-select" data-idx="${i}"
             style="flex-shrink:0;width:16px;height:16px;accent-color:var(--color-primary);cursor:pointer;"
             aria-label="Select ${escHtml(it.name || 'item')} for Add to List">
      <div class="item-info" style="flex:1;min-width:0;">
        <div class="item-name">${escHtml(it.name || '(unnamed)')}</div>
        ${meta ? `<div class="item-meta">${meta}</div>` : ''}
      </div>
      <button class="icon-btn" data-tpl-item-edit="${i}" aria-label="Edit item" title="Edit item" style="color:var(--color-text-muted);"><i data-lucide="pencil"></i></button>
      <button class="icon-btn" data-tpl-item-remove="${i}" aria-label="Remove item" style="color:var(--color-error);"><i data-lucide="x"></i></button>
    </div>`;
  }).join('');
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
  createIcons();
}

// ── Template Item sub-modal ───────────────────────────────────────────────────
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

// ── initTemplates — wires all template UI listeners ──────────────────────────
export function initTemplates({ templatesCol, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, buildCategoryOptions, confirmDelete,
                                 listsCol, itemsCol, writeBatch, db }) {

  document.getElementById('new-template-btn').addEventListener('click', () =>
    openTemplateEditor(null, { buildCategoryOptions })
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
      emoji: document.getElementById('tpl-emoji').value.trim() || '\uD83D\uDCCB',
      desc:  document.getElementById('tpl-desc').value.trim(),
      items: state.tplEditorItems,
      updatedAt: serverTimestamp()
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
      window.closeModal('modal-template-editor');
    } catch (e) { window.showToast('Error: ' + e.message, 'error'); }
  });

  document.getElementById('tpl-add-to-list-btn').addEventListener('click', openAddToListModal);

  document.getElementById('tpl-atl-confirm-btn').addEventListener('click', () =>
    addSelectedItemsToList({ listsCol, itemsCol, addDoc, writeBatch, doc, serverTimestamp, db })
  );

  document.getElementById('tpl-delete-btn').addEventListener('click', () => {
    if (!state.editingTemplateId) return;
    window.closeModal('modal-template-editor');
    confirmDelete('template', state.editingTemplateId);
  });
}
