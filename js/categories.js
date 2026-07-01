// js/categories.js
// Category and store CRUD rendering.

import { escHtml, createIcons } from './utils.js';

// -- Categories ---------------------------------------------------------------
export function renderCategories(allCategories, onDelete) {
  const grid = document.getElementById('categories-grid');
  if (!grid) return;
  if (allCategories.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><i data-lucide="tag"></i></div><h3>No categories</h3><p>Add a category to organize your items.</p></div>`;
    createIcons(); return;
  }
  grid.innerHTML = allCategories.map(cat => `
    <div class="card"><div class="card-body" style="display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:var(--text-sm);font-weight:500;">${cat.emoji || ''} ${escHtml(cat.name)}</span>
      <button class="icon-btn" data-delete-cat="${cat.id}" aria-label="Delete" style="color:var(--color-error);"><i data-lucide="trash-2"></i></button>
    </div></div>`).join('');
  grid.querySelectorAll('[data-delete-cat]').forEach(btn =>
    btn.addEventListener('click', () => onDelete('category', btn.dataset.deleteCat))
  );
  createIcons();
}

// -- Stores -------------------------------------------------------------------
export function renderStores(allStores, onDelete) {
  const grid = document.getElementById('stores-grid');
  if (!grid) return;
  if (allStores.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><i data-lucide="store"></i></div><h3>No stores</h3><p>Add your favorite grocery stores.</p></div>`;
    createIcons(); return;
  }
  grid.innerHTML = allStores.map(store => `
    <div class="card"><div class="card-body" style="display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:var(--text-sm);font-weight:600;">${escHtml(store.name)}</div>
      <button class="icon-btn" data-delete-store="${store.id}" aria-label="Delete" style="color:var(--color-error);"><i data-lucide="trash-2"></i></button>
    </div></div>`).join('');
  grid.querySelectorAll('[data-delete-store]').forEach(btn =>
    btn.addEventListener('click', () => onDelete('store', btn.dataset.deleteStore))
  );
  createIcons();
}

export function populateStoreSelect(allStores) {
  const sel = document.getElementById('new-list-store');
  if (!sel) return;
  sel.innerHTML = '<option value="">No default store</option>' +
    allStores.map(s => `<option value="${escHtml(s.name)}">${escHtml(s.name)}</option>`).join('');
}
