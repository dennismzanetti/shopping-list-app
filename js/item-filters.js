// js/item-filters.js — shared pure utility for filtering & sorting items
// Used by both the List Detail view (items.js) and the Template Editor (templates.js).

/**
 * Apply search / category / store / snap filters and a sort to an item array.
 * Returns a NEW array — never mutates the source.
 *
 * @param {Array}  items  - raw items (Firestore docs with .id, or plain template objects)
 * @param {Object} opts
 *   search   {string}  - case-insensitive substring match on item.name
 *   category {string}  - exact match on item.category  ('' = all)
 *   store    {string}  - item.stores.includes()         ('' = all)
 *   snap     {boolean} - when true, only items where item.snapEligible === true
 *   sort     {string}  - 'added'|'name-asc'|'name-desc'|'category'|'store'
 */
export function applyItemFilters(items, { search = '', category = '', store = '', snap = false, sort = 'added' } = {}) {
  let result = [...items];

  // --- filter ---
  if (search.trim()) {
    const q = search.trim().toLowerCase();
    result = result.filter(it => (it.name || '').toLowerCase().includes(q));
  }
  if (category) {
    result = result.filter(it => (it.category || '') === category);
  }
  if (store) {
    result = result.filter(it => Array.isArray(it.stores) && it.stores.includes(store));
  }
  if (snap) {
    result = result.filter(it => it.snapEligible === true);
  }

  // --- sort ---
  const cmp = (a, b) => {
    switch (sort) {
      case 'name-asc':  return (a.name || '').localeCompare(b.name || '');
      case 'name-desc': return (b.name || '').localeCompare(a.name || '');
      case 'category':  return (a.category || '').localeCompare(b.category || '') || (a.name || '').localeCompare(b.name || '');
      case 'store': {
        const sa = (a.stores?.[0] || '');
        const sb = (b.stores?.[0] || '');
        return sa.localeCompare(sb) || (a.name || '').localeCompare(b.name || '');
      }
      default: return 0; // 'added' — preserve original order
    }
  };
  if (sort !== 'added') result.sort(cmp);

  return result;
}

/**
 * Build the filter toolbar HTML string.
 * @param {string}   prefix      - unique id prefix, e.g. 'list' or 'tpl'
 * @param {Array}    categories  - state.allCategories
 * @param {Array}    stores      - state.allStores
 * @param {Object}   current     - { search, category, store, snap, sort }
 */
export function buildFilterToolbarHTML(prefix, categories, stores, current = {}) {
  const { search = '', category = '', store = '', snap = false, sort = 'added' } = current;
  const catOptions = categories.map(c =>
    `<option value="${_esc(c.name)}" ${category === c.name ? 'selected' : ''}>${_esc(c.emoji ? c.emoji + '\u00a0' : '')}${_esc(c.name)}</option>`
  ).join('');
  const storeOptions = stores.map(s =>
    `<option value="${_esc(s.name)}" ${store === s.name ? 'selected' : ''}>${_esc(s.name)}</option>`
  ).join('');
  const hasFilter = search || category || store || snap || sort !== 'added';
  return `
<div class="item-filter-toolbar" id="${prefix}-filter-toolbar">
  <div class="item-filter-search-wrap">
    <i data-lucide="search" class="item-filter-search-icon"></i>
    <input
      type="search"
      class="item-filter-search"
      id="${prefix}-filter-search"
      placeholder="Search items\u2026"
      value="${_esc(search)}"
      autocomplete="off"
    >
  </div>
  ${categories.length > 0 ? `
  <select class="item-filter-select" id="${prefix}-filter-category" aria-label="Filter by category">
    <option value="" ${!category ? 'selected' : ''}>All categories</option>
    ${catOptions}
  </select>` : ''}
  ${stores.length > 0 ? `
  <select class="item-filter-select" id="${prefix}-filter-store" aria-label="Filter by store">
    <option value="" ${!store ? 'selected' : ''}>All stores</option>
    ${storeOptions}
  </select>` : ''}
  <select class="item-filter-select" id="${prefix}-filter-sort" aria-label="Sort items">
    <option value="added"     ${sort === 'added'     ? 'selected' : ''}>Sort: Added</option>
    <option value="name-asc"  ${sort === 'name-asc'  ? 'selected' : ''}>Name A\u2192Z</option>
    <option value="name-desc" ${sort === 'name-desc' ? 'selected' : ''}>Name Z\u2192A</option>
    <option value="category"  ${sort === 'category'  ? 'selected' : ''}>Category</option>
    <option value="store"     ${sort === 'store'     ? 'selected' : ''}>Store</option>
  </select>
  <button
    class="snap-badge snap-filter-btn${snap ? ' active' : ''}"
    id="${prefix}-filter-snap"
    aria-label="Show SNAP eligible items only"
    aria-pressed="${snap ? 'true' : 'false'}"
    title="Show SNAP eligible items only"
  >SNAP only</button>
  ${hasFilter ? `<button class="item-filter-clear" id="${prefix}-filter-clear" aria-label="Clear filters" title="Clear all filters"><i data-lucide="x"></i> Clear</button>` : ''}
</div>`;
}

function _esc(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

/**
 * Wire up all filter toolbar events.
 * Calls onChange({ search, category, store, snap, sort }) whenever any control changes.
 *
 * @param {string}   prefix
 * @param {Function} onChange  - called with current filter state
 * @param {Object}   initial   - starting filter values
 * @returns {Function}  teardown — call to remove all listeners (useful on re-render)
 */
export function initFilterToolbar(prefix, onChange, initial = {}) {
  const state = { search: '', category: '', store: '', snap: false, sort: 'added', ...initial };

  const searchEl   = document.getElementById(`${prefix}-filter-search`);
  const catEl      = document.getElementById(`${prefix}-filter-category`);
  const storeEl    = document.getElementById(`${prefix}-filter-store`);
  const sortEl     = document.getElementById(`${prefix}-filter-sort`);
  const snapEl     = document.getElementById(`${prefix}-filter-snap`);
  const clearEl    = document.getElementById(`${prefix}-filter-clear`);

  let debounceTimer;

  function emit() { onChange({ ...state }); }

  const onSearch = () => {
    clearTimeout(debounceTimer);
    state.search = searchEl?.value ?? '';
    debounceTimer = setTimeout(emit, 200);
  };
  const onCat   = () => { state.category = catEl?.value   ?? ''; emit(); };
  const onStore = () => { state.store    = storeEl?.value ?? ''; emit(); };
  const onSort  = () => { state.sort     = sortEl?.value  ?? 'added'; emit(); };
  const onSnap  = () => {
    state.snap = !state.snap;
    if (snapEl) {
      snapEl.classList.toggle('active', state.snap);
      snapEl.setAttribute('aria-pressed', String(state.snap));
    }
    emit();
  };
  const onClear = () => {
    state.search = ''; state.category = ''; state.store = ''; state.snap = false; state.sort = 'added';
    if (searchEl) searchEl.value = '';
    if (catEl)    catEl.value    = '';
    if (storeEl)  storeEl.value  = '';
    if (sortEl)   sortEl.value   = 'added';
    if (snapEl)   { snapEl.classList.remove('active'); snapEl.setAttribute('aria-pressed', 'false'); }
    emit();
  };

  searchEl?.addEventListener('input',  onSearch);
  catEl?.addEventListener('change',    onCat);
  storeEl?.addEventListener('change',  onStore);
  sortEl?.addEventListener('change',   onSort);
  snapEl?.addEventListener('click',    onSnap);
  clearEl?.addEventListener('click',   onClear);

  return function teardown() {
    clearTimeout(debounceTimer);
    searchEl?.removeEventListener('input',  onSearch);
    catEl?.removeEventListener('change',    onCat);
    storeEl?.removeEventListener('change',  onStore);
    sortEl?.removeEventListener('change',   onSort);
    snapEl?.removeEventListener('click',    onSnap);
    clearEl?.removeEventListener('click',   onClear);
  };
}
