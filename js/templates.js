// js/templates.js
// Template list, template editor, and template-item modal.
//
// Depends on globals still in shopping-list.js during migration:
//   allTemplates, allStores, allCategories, tplEditorItems, tplItemEditingIdx,
//   editingTemplateId, templatesCol, buildCategoryOptions,
//   openModal, closeModal, showToast, createIcons, escHtml, toArray

import { db } from './firebase.js';
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';
import { escHtml, toArray, createIcons } from './utils.js';

// ── Subscription ────────────────────────────────────────────────────────────
export function subscribeToTemplates(templatesCol, onUpdate) {
  return onSnapshot(query(templatesCol(), orderBy('createdAt')), snap => {
    const templates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    onUpdate(templates);
  });
}

// ── Render grid ─────────────────────────────────────────────────────────────
export function renderTemplates(allTemplates, allCategories, onEdit) {
  const grid = document.getElementById('templates-grid');
  if (!grid) return;
  if (allTemplates.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><i data-lucide="layout-template"></i></div><h3>No templates yet</h3><p>Create a template to quickly start new lists.</p></div>`;
    createIcons(); return;
  }
  grid.innerHTML = allTemplates.map(t => {
    const items   = t.items || [];
    const preview = items.slice(0, 5);
    const more    = items.length - preview.length;
    const chips   = preview.map(it => {
      const cat    = allCategories.find(c => c.name === (it.category || ''));
      const prefix = cat?.emoji ? cat.emoji + ' ' : '';
      return `<span class="template-item-chip">${prefix}${escHtml(it.name || it)}</span>`;
    }).join('');
    const moreChip = more > 0 ? `<span class="template-item-chip">+${more} more</span>` : '';
    return `<div class="template-card" data-tpl-id="${t.id}" style="cursor:pointer;" title="Edit template">
      <div class="template-card-emoji">${t.emoji || '📋'}</div>
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

// ── Normalise item shape ─────────────────────────────────────────────────────
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

// ── Template editor modal ────────────────────────────────────────────────────
export function openTemplateEditor(tplId, allTemplates, tplEditorItemsRef, buildCategoryOptions) {
  const tpl = tplId ? allTemplates.find(t => t.id === tplId) : null;
  document.getElementById('tpl-editor-title').textContent             = tpl ? 'Edit Template' : 'New Template';
  document.getElementById('tpl-emoji').value                          = tpl ? (tpl.emoji || '') : '';
  document.getElementById('tpl-name').value                           = tpl ? tpl.name          : '';
  document.getElementById('tpl-desc').value                           = tpl ? (tpl.desc  || '') : '';
  document.getElementById('tpl-delete-btn').style.display             = tpl ? 'inline-flex' : 'none';
  tplEditorItemsRef.items = tpl ? (tpl.items || []).map(normaliseItem) : [];
  renderTplEditorItems(tplEditorItemsRef.items);
  window.openModal('modal-template-editor');
}

// ── Render items inside editor ───────────────────────────────────────────────
export function renderTplEditorItems(tplEditorItems) {
  const container = document.getElementById('tpl-editor-items');
  if (!container) return;
  const count = tplEditorItems.length;
  document.getElementById('tpl-item-count').textContent = `${count} item${count !== 1 ? 's' : ''}`;
  if (count === 0) {
    container.innerHTML = `<div style="font-size:var(--text-xs);color:var(--color-text-faint);text-align:center;padding:var(--space-4) var(--space-2);">No items yet — click "Add Item" below</div>`;
    return;
  }
  container.innerHTML = tplEditorItems.map((it, i) => {
    const qty   = it.qty  ? `<span class="item-qty-badge">${escHtml(it.qty)}${it.unit ? ' '+escHtml(it.unit) : ''}</span>` : '';
    const cat   = it.category ? `<span class="item-tag-chip"><i data-lucide="tag" style="width:10px;height:10px;"></i>${escHtml(it.category)}</span>` : '';
    const store = toArray(it.stores).map(s => `<span class="item-store-chip"><i data-lucide="store" style="width:10px;height:10px;"></i>${escHtml(s)}</span>`).join('');
    const tags  = toArray(it.tags).map(t => `<span class="item-tag-chip">${escHtml(t)}</span>`).join('');
    const notes = it.notes ? `<span style="color:var(--color-text-faint);font-size:var(--text-xs);">${escHtml(it.notes)}</span>` : '';
    const meta  = [qty, cat, store, tags, notes].filter(Boolean).join('');
    return `<div class="item-row" data-tpl-item-idx="${i}" style="cursor:pointer;" title="Click to edit">
      <div class="item-info" style="flex:1;min-width:0;">
        <div class="item-name">${escHtml(it.name || '(unnamed)')}</div>
        ${meta ? `<div class="item-meta">${meta}</div>` : ''}
      </div>
      <button class="icon-btn" data-tpl-item-edit="${i}" aria-label="Edit item" title="Edit item" style="color:var(--color-text-muted);"><i data-lucide="pencil"></i></button>
      <button class="icon-btn" data-tpl-item-remove="${i}" aria-label="Remove item" style="color:var(--color-error);"><i data-lucide="x"></i></button>
    </div>`;
  }).join('');
  container.querySelectorAll('[data-tpl-item-edit]').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); window.openTplItemModal(parseInt(btn.dataset.tplItemEdit)); })
  );
  container.querySelectorAll('[data-tpl-item-remove]').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); tplEditorItems.splice(parseInt(btn.dataset.tplItemRemove), 1); renderTplEditorItems(tplEditorItems); })
  );
  container.querySelectorAll('[data-tpl-item-idx]').forEach(row =>
    row.addEventListener('click', e => { if (e.target.closest('button')) return; window.openTplItemModal(parseInt(row.dataset.tplItemIdx)); })
  );
  createIcons();
}

// ── Template item modal ──────────────────────────────────────────────────────
export function populateTplItemStoreCheckboxes(allStores, selectedStores = []) {
  const container = document.getElementById('tpl-item-store-checkboxes');
  if (!container) return;
  if (allStores.length === 0) {
    container.innerHTML = `<span style="font-size:var(--text-xs);color:var(--color-text-faint);">No stores yet — add some in the Stores view.</span>`;
    return;
  }
  container.innerHTML = allStores.map(s =>
    `<label class="store-checkbox-label"><input type="checkbox" value="${escHtml(s.name)}" ${selectedStores.includes(s.name) ? 'checked' : ''}><span>${escHtml(s.name)}</span></label>`
  ).join('');
}

export function getTplItemSelectedStores() {
  return Array.from(
    document.getElementById('tpl-item-store-checkboxes')?.querySelectorAll('input[type=checkbox]:checked') || []
  ).map(cb => cb.value);
}

export function openTplItemModal(idx, tplEditorItems, allStores, buildCategoryOptions) {
  const it = idx >= 0 ? tplEditorItems[idx] : null;
  document.getElementById('tpl-item-modal-title').textContent = it ? 'Edit Item' : 'Add Item';
  document.getElementById('tpl-item-name').value  = it ? it.name  : '';
  document.getElementById('tpl-item-qty').value   = it ? it.qty   : '';
  document.getElementById('tpl-item-unit').value  = it ? it.unit  : '';
  document.getElementById('tpl-item-tags').value  = it ? toArray(it.tags).join(', ')  : '';
  document.getElementById('tpl-item-notes').value = it ? it.notes : '';
  const tplCatSel = document.getElementById('tpl-item-category');
  if (tplCatSel) tplCatSel.innerHTML = buildCategoryOptions(it ? it.category : '');
  populateTplItemStoreCheckboxes(allStores, it ? toArray(it.stores) : []);
  window.openModal('modal-tpl-item');
  setTimeout(() => document.getElementById('tpl-item-name').focus(), 50);
}

export function saveTplItem(tplEditorItems, tplItemEditingIdx) {
  const name = document.getElementById('tpl-item-name').value.trim();
  if (!name) { window.showToast('Item name is required', 'error'); return false; }
  const item = {
    name,
    qty:      document.getElementById('tpl-item-qty').value.trim(),
    unit:     document.getElementById('tpl-item-unit').value.trim(),
    category: document.getElementById('tpl-item-category').value,
    stores:   getTplItemSelectedStores(),
    tags:     document.getElementById('tpl-item-tags').value.split(',').map(s => s.trim()).filter(Boolean),
    notes:    document.getElementById('tpl-item-notes').value.trim()
  };
  if (tplItemEditingIdx >= 0) {
    tplEditorItems[tplItemEditingIdx] = item;
  } else {
    tplEditorItems.push(item);
  }
  window.closeModal('modal-tpl-item');
  renderTplEditorItems(tplEditorItems);
  return true;
}
