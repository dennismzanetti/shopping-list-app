import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-auth.js';
import {
  getFirestore, collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp, writeBatch, getDocs
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyBpUygy_Y-4tDLeYJwPFI338kA4yG3n8uE",
  authDomain: "shoppinglist-bf78d.firebaseapp.com",
  projectId: "shoppinglist-bf78d",
  storageBucket: "shoppinglist-bf78d.firebasestorage.app",
  messagingSenderId: "9753469863",
  appId: "1:9753469863:web:8e9871309634749b6b0c82",
  measurementId: "G-Q9D8TDYE7N"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

function createIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
}

// ── State ──────────────────────────────────────────────────────────────────
let currentUser = null;
let currentListId = null;
let unsubLists = null;
let unsubItems = null;
let unsubCategories = null;
let unsubStores = null;
let unsubTemplates = null;
let allLists = [];
let allItems = [];
let allCategories = [];
let allStores = [];
let allTemplates = [];
let editingTemplateId = null;
let tplEditorItems = [];
// Index of the tplEditorItems entry being edited in the tpl-item modal; -1 = new
let tplItemEditingIdx = -1;
let pendingDelete = null;
let pendingListId = null;
let currentTheme = 'light';

// ── Hash-based list restore ────────────────────────────────────────────────
function getHashListId() {
  const m = window.location.hash.match(/^#list\/(.+)$/);
  return m ? m[1] : null;
}
function setHashListId(listId) {
  history.replaceState(null, '', listId ? `#list/${listId}` : '#');
}

// ── Seed Data ──────────────────────────────────────────────────────────────
const SEED_TEMPLATES = [
  { emoji:'🛒', name:'Weekly Groceries', desc:'Everyday essentials for the week',
    items:[
      {name:'Milk',qty:'1',unit:'gal',stores:[],tags:[],notes:''},
      {name:'Eggs',qty:'1',unit:'doz',stores:[],tags:[],notes:''},
      {name:'Bread',qty:'1',unit:'loaf',stores:[],tags:[],notes:''},
      {name:'Butter',qty:'',unit:'',stores:[],tags:[],notes:''},
      {name:'Cheese',qty:'',unit:'',stores:[],tags:[],notes:''},
      {name:'Chicken breast',qty:'2',unit:'lbs',stores:[],tags:[],notes:''},
      {name:'Pasta',qty:'1',unit:'box',stores:[],tags:[],notes:''},
      {name:'Rice',qty:'',unit:'',stores:[],tags:[],notes:''},
      {name:'Olive oil',qty:'',unit:'',stores:[],tags:[],notes:''},
      {name:'Bananas',qty:'',unit:'',stores:[],tags:[],notes:''},
      {name:'Spinach',qty:'',unit:'',stores:[],tags:[],notes:''}
    ] },
  { emoji:'🥩', name:'BBQ & Grilling', desc:'Everything you need for a backyard cookout',
    items:[
      {name:'Burgers',qty:'2',unit:'lbs',stores:[],tags:[],notes:''},
      {name:'Hot dogs',qty:'1',unit:'pkg',stores:[],tags:[],notes:''},
      {name:'Chicken wings',qty:'3',unit:'lbs',stores:[],tags:[],notes:''},
      {name:'Buns',qty:'1',unit:'pkg',stores:[],tags:[],notes:''},
      {name:'Ketchup',qty:'',unit:'',stores:[],tags:[],notes:''},
      {name:'Mustard',qty:'',unit:'',stores:[],tags:[],notes:''},
      {name:'BBQ sauce',qty:'',unit:'',stores:[],tags:[],notes:''},
      {name:'Corn on the cob',qty:'6',unit:'',stores:[],tags:[],notes:''}
    ] },
  { emoji:'🎉', name:'Party Supplies', desc:'Stock up for a gathering or celebration',
    items:[
      {name:'Chips & dip',qty:'',unit:'',stores:[],tags:['snacks'],notes:''},
      {name:'Soda',qty:'2',unit:'cases',stores:[],tags:['beverages'],notes:''},
      {name:'Ice',qty:'2',unit:'bags',stores:[],tags:[],notes:''},
      {name:'Plates',qty:'50',unit:'',stores:[],tags:['supplies'],notes:''},
      {name:'Cups',qty:'50',unit:'',stores:[],tags:['supplies'],notes:''},
      {name:'Napkins',qty:'1',unit:'pkg',stores:[],tags:['supplies'],notes:''}
    ] },
  { emoji:'🏠', name:'Household Basics', desc:'Cleaning and home essentials',
    items:[
      {name:'Paper towels',qty:'6',unit:'rolls',stores:[],tags:['cleaning'],notes:''},
      {name:'Toilet paper',qty:'12',unit:'rolls',stores:[],tags:[],notes:''},
      {name:'Dish soap',qty:'1',unit:'bottle',stores:[],tags:['cleaning'],notes:''},
      {name:'Laundry detergent',qty:'',unit:'',stores:[],tags:['cleaning'],notes:''},
      {name:'Trash bags',qty:'1',unit:'box',stores:[],tags:[],notes:''},
      {name:'Sponges',qty:'',unit:'',stores:[],tags:['cleaning'],notes:''}
    ] },
  { emoji:'🥗', name:'Healthy Eating', desc:'Fresh produce and wholesome staples',
    items:[
      {name:'Kale',qty:'1',unit:'bunch',stores:[],tags:['produce','organic'],notes:''},
      {name:'Spinach',qty:'1',unit:'bag',stores:[],tags:['produce'],notes:''},
      {name:'Broccoli',qty:'1',unit:'head',stores:[],tags:['produce'],notes:''},
      {name:'Avocados',qty:'4',unit:'',stores:[],tags:['produce'],notes:''},
      {name:'Blueberries',qty:'1',unit:'pint',stores:[],tags:['produce'],notes:''},
      {name:'Greek yogurt',qty:'',unit:'',stores:[],tags:['dairy'],notes:''},
      {name:'Quinoa',qty:'1',unit:'bag',stores:[],tags:[],notes:''},
      {name:'Salmon',qty:'1',unit:'lb',stores:[],tags:['seafood'],notes:''},
      {name:'Almonds',qty:'1',unit:'bag',stores:[],tags:['snacks'],notes:''}
    ] },
  { emoji:'🍝', name:'Pasta Night', desc:'Ingredients for a classic Italian dinner',
    items:[
      {name:'Spaghetti',qty:'1',unit:'box',stores:[],tags:[],notes:''},
      {name:'Marinara sauce',qty:'1',unit:'jar',stores:[],tags:[],notes:''},
      {name:'Ground beef',qty:'1',unit:'lb',stores:[],tags:[],notes:''},
      {name:'Parmesan cheese',qty:'',unit:'',stores:[],tags:['dairy'],notes:''},
      {name:'Garlic',qty:'1',unit:'head',stores:[],tags:['produce'],notes:''},
      {name:'Olive oil',qty:'',unit:'',stores:[],tags:[],notes:''},
      {name:'Fresh basil',qty:'1',unit:'bunch',stores:[],tags:['produce'],notes:''}
    ] },
  { emoji:'🥞', name:'Breakfast Week', desc:'Morning staples to start every day right',
    items:[
      {name:'Eggs',qty:'2',unit:'doz',stores:[],tags:[],notes:''},
      {name:'Bacon',qty:'1',unit:'pkg',stores:[],tags:[],notes:''},
      {name:'Bread',qty:'1',unit:'loaf',stores:[],tags:[],notes:''},
      {name:'Butter',qty:'',unit:'',stores:[],tags:[],notes:''},
      {name:'Milk',qty:'1',unit:'gal',stores:[],tags:['dairy'],notes:''},
      {name:'Orange juice',qty:'1',unit:'jug',stores:[],tags:['beverages'],notes:''},
      {name:'Coffee',qty:'1',unit:'bag',stores:[],tags:['beverages'],notes:''},
      {name:'Oats',qty:'1',unit:'box',stores:[],tags:[],notes:''},
      {name:'Maple syrup',qty:'',unit:'',stores:[],tags:[],notes:''}
    ] },
  { emoji:'🎒', name:'Back to School', desc:'Lunches and snacks for busy school days',
    items:[
      {name:'Sandwich bread',qty:'1',unit:'loaf',stores:[],tags:[],notes:''},
      {name:'Peanut butter',qty:'1',unit:'jar',stores:[],tags:[],notes:''},
      {name:'Jelly',qty:'1',unit:'jar',stores:[],tags:[],notes:''},
      {name:'Apple',qty:'6',unit:'',stores:[],tags:['produce'],notes:''},
      {name:'Granola bars',qty:'1',unit:'box',stores:[],tags:['snacks'],notes:''},
      {name:'Juice boxes',qty:'1',unit:'box',stores:[],tags:['beverages'],notes:''},
      {name:'String cheese',qty:'1',unit:'pkg',stores:[],tags:['dairy'],notes:''}
    ] }
];

// ── Utility ────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function toArray(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string' && val.trim()) return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

// ── Theme ──────────────────────────────────────────────────────────────────
function syncThemeUI() {
  const html = document.documentElement;
  html.setAttribute('data-theme', currentTheme);
  const btn = document.getElementById('theme-toggle');
  const toggle = document.getElementById('dark-mode-toggle');
  if (btn) btn.innerHTML = currentTheme === 'dark'
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  if (toggle) toggle.checked = currentTheme === 'dark';
}
function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  syncThemeUI();
}

// ── Auth ───────────────────────────────────────────────────────────────────
const provider = new GoogleAuthProvider();

// ── Firestore Helpers ──────────────────────────────────────────────────────
const uid = () => currentUser.uid;
const listsCol = () => collection(db, 'users', uid(), 'lists');
const itemsCol = (listId) => collection(db, 'users', uid(), 'lists', listId, 'items');
const categoriesCol = () => collection(db, 'users', uid(), 'categories');
const storesCol = () => collection(db, 'users', uid(), 'stores');
const templatesCol = () => collection(db, 'users', uid(), 'templates');

async function seedDefaultsIfNeeded() {
  const catSnap = await getDocs(categoriesCol());
  if (catSnap.empty) {
    const defaults = [
      { name: 'Produce', emoji: '🥦' }, { name: 'Dairy', emoji: '🧀' },
      { name: 'Meat & Seafood', emoji: '🥩' }, { name: 'Bakery', emoji: '🍞' },
      { name: 'Frozen', emoji: '🧊' }, { name: 'Beverages', emoji: '🥤' },
      { name: 'Snacks', emoji: '🍿' }, { name: 'Household', emoji: '🧹' },
      { name: 'Personal Care', emoji: '🧴' }, { name: 'Other', emoji: '📦' },
    ];
    const batch = writeBatch(db);
    defaults.forEach(cat => batch.set(doc(categoriesCol()), { ...cat, createdAt: serverTimestamp() }));
    await batch.commit();
  }
  const storeSnap = await getDocs(storesCol());
  if (storeSnap.empty) {
    const defaults = ['Walmart','Target','Whole Foods','Costco',"Trader Joe's",'Stop & Shop',"Shaw's",'Market Basket'];
    const batch = writeBatch(db);
    defaults.forEach(name => batch.set(doc(storesCol()), { name, createdAt: serverTimestamp() }));
    await batch.commit();
  }
}

async function seedTemplatesIfNeeded() {
  const snap = await getDocs(templatesCol());
  if (snap.empty) {
    const batch = writeBatch(db);
    SEED_TEMPLATES.forEach(t => batch.set(doc(templatesCol()), { ...t, createdAt: serverTimestamp() }));
    await batch.commit();
  }
}

function teardownSubscriptions() {
  if (unsubLists) { unsubLists(); unsubLists = null; }
  if (unsubItems) { unsubItems(); unsubItems = null; }
  if (unsubCategories) { unsubCategories(); unsubCategories = null; }
  if (unsubStores) { unsubStores(); unsubStores = null; }
  if (unsubTemplates) { unsubTemplates(); unsubTemplates = null; }
  allLists = []; allItems = []; allCategories = []; allStores = []; allTemplates = [];
}

let listsFirstLoad = true;

function subscribeToData() {
  listsFirstLoad = true;
  seedDefaultsIfNeeded();
  seedTemplatesIfNeeded();
  subscribeToTemplates();

  unsubCategories = onSnapshot(query(categoriesCol(), orderBy('createdAt')), snap => {
    allCategories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderCategories();
  });

  unsubStores = onSnapshot(query(storesCol(), orderBy('createdAt')), snap => {
    allStores = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderStores();
    populateStoreSelect();
  });

  unsubLists = onSnapshot(query(listsCol(), orderBy('createdAt', 'desc')), snap => {
    allLists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLists();
    document.getElementById('badge-lists').textContent = allLists.length;
    if (listsFirstLoad) {
      listsFirstLoad = false;
      const restoreId = pendingListId;
      pendingListId = null;
      if (restoreId && allLists.find(l => l.id === restoreId)) openList(restoreId);
    }
  });
}

// ── Templates ──────────────────────────────────────────────────────────────
function subscribeToTemplates() {
  unsubTemplates = onSnapshot(query(templatesCol(), orderBy('createdAt')), snap => {
    allTemplates = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderTemplates();
  });
}

function renderTemplates() {
  const grid = document.getElementById('templates-grid');
  if (!grid) return;
  if (allTemplates.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><i data-lucide="layout-template"></i></div><h3>No templates yet</h3><p>Create a template to quickly start new lists.</p></div>`;
    createIcons(); return;
  }
  grid.innerHTML = allTemplates.map(t => {
    const items = t.items || [];
    const preview = items.slice(0, 5);
    const more = items.length - preview.length;
    const chips = preview.map(it => `<span class="template-item-chip">${escHtml(it.name || it)}</span>`).join('');
    const moreChip = more > 0 ? `<span class="template-item-chip">+${more} more</span>` : '';
    return `<div class="template-card" data-tpl-id="${t.id}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;">
        <div class="template-card-emoji">${t.emoji || '📋'}</div>
        <button class="icon-btn template-card-edit-btn" data-edit-tpl="${t.id}" aria-label="Edit template" title="Edit template"><i data-lucide="pencil"></i></button>
      </div>
      <div><div class="template-card-title">${escHtml(t.name)}</div><div class="template-card-desc">${escHtml(t.desc || '')}</div></div>
      <div class="template-card-items">${chips}${moreChip}</div>
      <div class="template-card-footer">
        <span class="template-item-count">${items.length} item${items.length !== 1 ? 's' : ''}</span>
        <button class="btn btn-primary" data-use-tpl="${t.id}"><i data-lucide="plus"></i> Use Template</button>
      </div>
    </div>`;
  }).join('');
  grid.querySelectorAll('[data-use-tpl]').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); useTemplate(btn.dataset.useTpl); }));
  grid.querySelectorAll('[data-edit-tpl]').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); openTemplateEditor(btn.dataset.editTpl); }));
  createIcons();
}

async function useTemplate(tplId) {
  const tpl = allTemplates.find(t => t.id === tplId);
  if (!tpl || !currentUser) return;
  const items = tpl.items || [];
  try {
    const listRef = await addDoc(listsCol(), { name: tpl.name, storeName: '', itemCount: items.length, checkedCount: 0, createdAt: serverTimestamp() });
    const batch = writeBatch(db);
    items.forEach(it => {
      const name = typeof it === 'string' ? it : (it.name || '');
      batch.set(doc(itemsCol(listRef.id)), {
        name,
        qty:    typeof it === 'object' ? (it.qty   || '') : '',
        unit:   typeof it === 'object' ? (it.unit  || '') : '',
        stores: toArray(typeof it === 'object' ? it.stores : []),
        tags:   toArray(typeof it === 'object' ? it.tags   : []),
        notes:  typeof it === 'object' ? (it.notes || '') : '',
        checked: false,
        createdAt: serverTimestamp()
      });
    });
    await batch.commit();
    showToast(`"${tpl.name}" created with ${items.length} items!`, 'success');
    navigateTo('lists');
    setTimeout(() => openList(listRef.id), 300);
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ── Template Editor ────────────────────────────────────────────────────────
function openTemplateEditor(tplId) {
  editingTemplateId = tplId || null;
  const tpl = tplId ? allTemplates.find(t => t.id === tplId) : null;
  document.getElementById('tpl-editor-title').textContent = tpl ? 'Edit Template' : 'New Template';
  document.getElementById('tpl-emoji').value = tpl ? (tpl.emoji || '') : '';
  document.getElementById('tpl-name').value  = tpl ? tpl.name          : '';
  document.getElementById('tpl-desc').value  = tpl ? (tpl.desc  || '') : '';
  document.getElementById('tpl-delete-btn').style.display = tpl ? 'inline-flex' : 'none';
  // Normalise items — always ensure all fields present
  tplEditorItems = tpl ? (tpl.items || []).map(normaliseItem) : [];
  renderTplEditorItems();
  openModal('modal-template-editor');
}

/** Ensure every item has all the same fields as a shopping-list item */
function normaliseItem(it) {
  if (typeof it === 'string') return { name: it, qty: '', unit: '', stores: [], tags: [], notes: '' };
  return {
    name:   it.name   || '',
    qty:    it.qty    || '',
    unit:   it.unit   || '',
    stores: toArray(it.stores),
    tags:   toArray(it.tags),
    notes:  it.notes  || ''
  };
}

function renderTplEditorItems() {
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
    const store = toArray(it.stores).map(s => `<span class="item-store-chip"><i data-lucide="store" style="width:10px;height:10px;"></i>${escHtml(s)}</span>`).join('');
    const tags  = toArray(it.tags).map(t => `<span class="item-tag-chip">${escHtml(t)}</span>`).join('');
    const notes = it.notes ? `<span style="color:var(--color-text-faint);font-size:var(--text-xs);">${escHtml(it.notes)}</span>` : '';
    const meta  = [qty, store, tags, notes].filter(Boolean).join('');
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
    btn.addEventListener('click', e => { e.stopPropagation(); openTplItemModal(parseInt(btn.dataset.tplItemEdit)); })
  );
  container.querySelectorAll('[data-tpl-item-remove]').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); tplEditorItems.splice(parseInt(btn.dataset.tplItemRemove), 1); renderTplEditorItems(); })
  );
  // Click row to edit
  container.querySelectorAll('[data-tpl-item-idx]').forEach(row =>
    row.addEventListener('click', e => { if (e.target.closest('button')) return; openTplItemModal(parseInt(row.dataset.tplItemIdx)); })
  );
  createIcons();
}

// ── Template Item Modal ────────────────────────────────────────────────────
function populateTplItemStoreCheckboxes(selectedStores = []) {
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
function getTplItemSelectedStores() {
  return Array.from(document.getElementById('tpl-item-store-checkboxes')?.querySelectorAll('input[type=checkbox]:checked') || []).map(cb => cb.value);
}

function openTplItemModal(idx) {
  tplItemEditingIdx = idx;  // -1 means new
  const it = idx >= 0 ? tplEditorItems[idx] : null;
  document.getElementById('tpl-item-modal-title').textContent = it ? 'Edit Item' : 'Add Item';
  document.getElementById('tpl-item-name').value  = it ? it.name  : '';
  document.getElementById('tpl-item-qty').value   = it ? it.qty   : '';
  document.getElementById('tpl-item-unit').value  = it ? it.unit  : '';
  document.getElementById('tpl-item-tags').value  = it ? toArray(it.tags).join(', ')  : '';
  document.getElementById('tpl-item-notes').value = it ? it.notes : '';
  populateTplItemStoreCheckboxes(it ? toArray(it.stores) : []);
  openModal('modal-tpl-item');
  setTimeout(() => document.getElementById('tpl-item-name').focus(), 50);
}
window.closeTplItemModal = function() { closeModal('modal-tpl-item'); };

function saveTplItem() {
  const name = document.getElementById('tpl-item-name').value.trim();
  if (!name) { showToast('Item name is required', 'error'); return; }
  const item = {
    name,
    qty:    document.getElementById('tpl-item-qty').value.trim(),
    unit:   document.getElementById('tpl-item-unit').value.trim(),
    stores: getTplItemSelectedStores(),
    tags:   document.getElementById('tpl-item-tags').value.split(',').map(s => s.trim()).filter(Boolean),
    notes:  document.getElementById('tpl-item-notes').value.trim()
  };
  if (tplItemEditingIdx >= 0) {
    tplEditorItems[tplItemEditingIdx] = item;
  } else {
    tplEditorItems.push(item);
  }
  closeModal('modal-tpl-item');
  renderTplEditorItems();
}

// ── Lists ──────────────────────────────────────────────────────────────────
function renderLists() {
  const grid = document.getElementById('lists-grid');
  const q = document.getElementById('search-lists').value.toLowerCase();
  const filtered = allLists.filter(l => l.name.toLowerCase().includes(q));
  document.getElementById('lists-subtitle').textContent = allLists.length === 1 ? '1 list' : `${allLists.length} lists`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-state-icon"><i data-lucide="shopping-cart"></i></div>
      <h3>${q ? 'No matching lists' : 'No lists yet'}</h3>
      <p>${q ? 'Try a different search.' : 'Create your first shopping list to get started.'}</p>
      ${!q ? '<button class="btn btn-primary" id="empty-new-list-btn"><i data-lucide="plus"></i> New List</button>' : ''}
    </div>`;
    document.getElementById('empty-new-list-btn')?.addEventListener('click', () => openModal('modal-new-list'));
    createIcons(); return;
  }

  grid.innerHTML = filtered.map(list => {
    const total = list.itemCount || 0, checked = list.checkedCount || 0;
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    const isDone = total > 0 && checked === total;
    const badge = isDone ? `<span class="badge badge-success">Done</span>` : `<span class="badge badge-primary">Active</span>`;
    const storeName = list.storeName ? `<span>${list.storeName}</span>` : '';
    return `<div class="list-card" data-id="${list.id}">
      <div class="list-card-actions"><button class="icon-btn" data-delete-list="${list.id}" aria-label="Delete list" style="color:var(--color-error)"><i data-lucide="trash-2"></i></button></div>
      <div class="list-card-header"><div><div class="list-card-title">${escHtml(list.name)}</div><div class="list-card-meta">${storeName}<span>${total} item${total !== 1 ? 's' : ''}</span><span>${checked} checked</span></div></div>${badge}</div>
      <div class="list-card-progress"><div class="list-card-progress-bar" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.list-card').forEach(card => card.addEventListener('click', e => { if (e.target.closest('[data-delete-list]')) return; openList(card.dataset.id); }));
  grid.querySelectorAll('[data-delete-list]').forEach(btn => btn.addEventListener('click', e => { e.stopPropagation(); confirmDelete('list', btn.dataset.deleteList); }));
  createIcons();
}

// ── List Detail ────────────────────────────────────────────────────────────
function openList(listId) {
  currentListId = listId;
  setHashListId(listId);
  const list = allLists.find(l => l.id === listId);
  if (!list) return;
  document.getElementById('detail-list-name').textContent = list.name;
  document.getElementById('detail-list-store').textContent = list.storeName ? `📍 ${list.storeName}` : '';
  document.getElementById('header-title').textContent = list.name;
  navigateTo('list-detail');
  if (unsubItems) { unsubItems(); unsubItems = null; }
  unsubItems = onSnapshot(query(itemsCol(listId), orderBy('createdAt')), snap => {
    allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderItems();
    updateListCounts(listId);
  });
}

function renderItems() {
  const list_ = document.getElementById('items-list');
  const empty = document.getElementById('items-empty');
  const unchecked = allItems.filter(i => !i.checked);
  const checked = allItems.filter(i => i.checked);
  const total = allItems.length, doneCount = checked.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;
  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `${doneCount} of ${total} checked`;
  if (total === 0) { empty.style.display = 'flex'; list_.innerHTML = ''; return; }
  empty.style.display = 'none';

  const renderGroup = items => items.map(item => {
    const qty = item.qty ? `<span class="item-qty-badge">${escHtml(item.qty)}${item.unit ? ' '+escHtml(item.unit) : ''}</span>` : '';
    const storeChips = toArray(item.stores).map(s => `<span class="item-store-chip"><i data-lucide="store" style="width:10px;height:10px;"></i>${escHtml(s)}</span>`).join('');
    const tagChips = toArray(item.tags).map(t => `<span class="item-tag-chip">${escHtml(t)}</span>`).join('');
    const notes = item.notes ? `<span style="color:var(--color-text-faint);font-size:var(--text-xs);">${escHtml(item.notes)}</span>` : '';
    const meta = [qty,storeChips,tagChips,notes].filter(Boolean).join('');
    return `<div class="item-row${item.checked?' checked':''}" data-item-id="${item.id}">
      <div class="item-checkbox${item.checked?' checked':''}" data-toggle="${item.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div class="item-info"><div class="item-name">${escHtml(item.name)}</div>${meta?`<div class="item-meta">${meta}</div>`:''}</div>
      <button class="icon-btn item-delete" data-delete-item="${item.id}" aria-label="Delete item" style="color:var(--color-error);"><i data-lucide="x"></i></button>
    </div>`;
  }).join('');

  let html = unchecked.length > 0 ? renderGroup(unchecked) : '';
  if (checked.length > 0) html += `<div class="items-section-label">Checked (${checked.length})</div>` + renderGroup(checked);
  list_.innerHTML = html;
  list_.querySelectorAll('[data-toggle]').forEach(el => el.addEventListener('click', () => toggleItem(el.dataset.toggle)));
  list_.querySelectorAll('[data-delete-item]').forEach(btn => btn.addEventListener('click', () => deleteItem(btn.dataset.deleteItem)));
  createIcons();
}

async function updateListCounts(listId) {
  try { await updateDoc(doc(listsCol(), listId), { itemCount: allItems.length, checkedCount: allItems.filter(i=>i.checked).length }); } catch {}
}

// ── Item Store Checkboxes (shopping list) ──────────────────────────────────
function populateItemStoreCheckboxes(selectedStores = []) {
  const container = document.getElementById('item-store-checkboxes');
  if (!container) return;
  if (allStores.length === 0) { container.innerHTML = `<span style="font-size:var(--text-xs);color:var(--color-text-faint);">No stores yet — add some in the Stores view.</span>`; return; }
  container.innerHTML = allStores.map(s => `<label class="store-checkbox-label"><input type="checkbox" value="${escHtml(s.name)}" ${selectedStores.includes(s.name)?'checked':''}><span>${escHtml(s.name)}</span></label>`).join('');
}
function getSelectedStores() {
  return Array.from(document.getElementById('item-store-checkboxes')?.querySelectorAll('input[type=checkbox]:checked') || []).map(cb => cb.value);
}

function openAddItemModal(prefillName = '') {
  if (!currentListId) { showToast('No list selected — please open a list first', 'error'); return; }
  document.getElementById('item-name-full').value = prefillName;
  document.getElementById('item-qty').value = '';
  document.getElementById('item-unit').value = '';
  document.getElementById('item-tags').value = '';
  document.getElementById('item-notes').value = '';
  populateItemStoreCheckboxes();
  openModal('modal-add-item');
  setTimeout(() => document.getElementById('item-name-full').focus(), 50);
}

// ── Categories ─────────────────────────────────────────────────────────────
function renderCategories() {
  const grid = document.getElementById('categories-grid');
  if (allCategories.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><i data-lucide="tag"></i></div><h3>No categories</h3><p>Add a category to organize your items.</p></div>`;
    createIcons(); return;
  }
  grid.innerHTML = allCategories.map(cat => `
    <div class="card"><div class="card-body" style="display:flex;align-items:center;justify-content:space-between;">
      <span style="font-size:var(--text-sm);font-weight:500;">${cat.emoji||''} ${escHtml(cat.name)}</span>
      <button class="icon-btn" data-delete-cat="${cat.id}" aria-label="Delete" style="color:var(--color-error);"><i data-lucide="trash-2"></i></button>
    </div></div>`).join('');
  grid.querySelectorAll('[data-delete-cat]').forEach(btn => btn.addEventListener('click', () => confirmDelete('category', btn.dataset.deleteCat)));
  createIcons();
}

// ── Stores ─────────────────────────────────────────────────────────────────
function renderStores() {
  const grid = document.getElementById('stores-grid');
  if (allStores.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><i data-lucide="store"></i></div><h3>No stores</h3><p>Add your favorite grocery stores.</p></div>`;
    createIcons(); return;
  }
  grid.innerHTML = allStores.map(store => `
    <div class="card"><div class="card-body" style="display:flex;align-items:center;justify-content:space-between;">
      <div style="font-size:var(--text-sm);font-weight:600;">${escHtml(store.name)}</div>
      <button class="icon-btn" data-delete-store="${store.id}" aria-label="Delete" style="color:var(--color-error);"><i data-lucide="trash-2"></i></button>
    </div></div>`).join('');
  grid.querySelectorAll('[data-delete-store]').forEach(btn => btn.addEventListener('click', () => confirmDelete('store', btn.dataset.deleteStore)));
  createIcons();
}
function populateStoreSelect() {
  document.getElementById('new-list-store').innerHTML = '<option value="">No default store</option>' +
    allStores.map(s => `<option value="${escHtml(s.name)}">${escHtml(s.name)}</option>`).join('');
}

// ── Delete ─────────────────────────────────────────────────────────────────
function confirmDelete(type, id) {
  pendingDelete = { type, id };
  const titles = { list:'Delete List?', category:'Delete Category?', store:'Delete Store?', template:'Delete Template?' };
  const msgs   = { list:'This will permanently delete the list and all its items.', category:'This category will be removed.', store:'This store will be removed.', template:'This template will be permanently deleted.' };
  document.getElementById('confirm-title').textContent   = titles[type];
  document.getElementById('confirm-message').textContent = msgs[type];
  openModal('modal-confirm');
}

// ── Navigation ─────────────────────────────────────────────────────────────
const viewTitles = { lists:'My Lists', 'list-detail':'', templates:'Templates', categories:'Categories', stores:'Stores', settings:'Settings' };
function navigateTo(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.add('active');
  document.querySelectorAll(`[data-view="${view}"]`).forEach(n => n.classList.add('active'));
  if (viewTitles[view]) document.getElementById('header-title').textContent = viewTitles[view];
  document.getElementById('header-add-btn').style.display = ['lists','list-detail','categories','stores','templates'].includes(view) ? 'flex' : 'none';
  closeSidebar();
  createIcons();
}
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-backdrop').classList.remove('open');
}

// ── Modals ─────────────────────────────────────────────────────────────────
window.openModal  = id => { const el = document.getElementById(id); if (el) { el.classList.add('open'); createIcons(); } };
window.closeModal = id => { const el = document.getElementById(id); if (el) el.classList.remove('open'); };

// ── Toast ──────────────────────────────────────────────────────────────────
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '');
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
  toast.innerHTML = `<i data-lucide="${icon}"></i> ${msg}`;
  container.appendChild(toast);
  createIcons();
  setTimeout(() => { toast.style.animation = 'toast-out .2s ease forwards'; setTimeout(() => toast.remove(), 200); }, 3000);
}
window.showToast = showToast;

// ── Build meta ─────────────────────────────────────────────────────────────
async function loadBuildMeta() {
  const el = document.getElementById('build-meta');
  const repoUrl = 'https://github.com/dennismzanetti/shopping-list-app';
  try {
    const res = await fetch('./version.json', { cache: 'no-store' });
    if (!res.ok) throw new Error();
    const v = await res.json();
    const shortSha  = (v.sha || '').slice(0, 7);
    const buildLabel = v.buildNumber ? `#${v.buildNumber}` : '';
    const shaLink    = shortSha ? ` · <a href="${v.commitUrl}" target="_blank" rel="noopener noreferrer">${shortSha}</a>` : '';
    el.innerHTML = `Build ${buildLabel}${shaLink} · <a href="${v.repo||repoUrl}" target="_blank" rel="noopener noreferrer">View source</a>`;
  } catch { el.innerHTML = `<a href="${repoUrl}" target="_blank" rel="noopener noreferrer">View source</a>`; }
}

// ── Bootstrap — all DOM wiring happens here ────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {

  syncThemeUI();

  // Auth
  document.getElementById('google-signin-btn').addEventListener('click', async () => {
    document.getElementById('auth-body').style.display    = 'none';
    document.getElementById('auth-loading').style.display = 'flex';
    try { await signInWithPopup(auth, provider); }
    catch (e) {
      document.getElementById('auth-body').style.display    = 'block';
      document.getElementById('auth-loading').style.display = 'none';
      showToast('Sign-in failed: ' + e.message, 'error');
    }
  });

  document.getElementById('signout-btn').addEventListener('click', async () => {
    await signOut(auth); showToast('Signed out', 'info');
  });

  onAuthStateChanged(auth, user => {
    if (user) {
      currentUser = user;
      document.getElementById('auth-screen').style.display = 'none';
      document.getElementById('app').style.display         = 'block';
      updateUserUI();
      pendingListId = getHashListId();
      subscribeToData();
      createIcons();
    } else {
      currentUser = null;
      document.getElementById('app').style.display         = 'none';
      document.getElementById('auth-screen').style.display = 'flex';
      document.getElementById('auth-body').style.display    = 'block';
      document.getElementById('auth-loading').style.display = 'none';
      teardownSubscriptions();
    }
  });

  // Theme
  document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
  document.getElementById('dark-mode-toggle').addEventListener('change', toggleTheme);

  // Header add button — context-aware
  document.getElementById('header-add-btn').addEventListener('click', () => {
    const view = document.querySelector('.view.active')?.id?.replace('view-', '');
    if (view === 'lists')       openModal('modal-new-list');
    else if (view === 'list-detail') openAddItemModal();
    else if (view === 'categories')  openModal('modal-new-category');
    else if (view === 'stores')      openModal('modal-new-store');
    else if (view === 'templates')   openTemplateEditor(null);
  });

  // New list
  document.getElementById('new-list-btn').addEventListener('click', () => openModal('modal-new-list'));
  document.getElementById('search-lists').addEventListener('input', renderLists);
  document.getElementById('create-list-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-list-name').value.trim();
    if (!name) { showToast('Please enter a list name', 'error'); return; }
    try {
      await addDoc(listsCol(), { name, storeName: document.getElementById('new-list-store').value || '', itemCount: 0, checkedCount: 0, createdAt: serverTimestamp() });
      closeModal('modal-new-list');
      document.getElementById('new-list-name').value  = '';
      document.getElementById('new-list-store').value = '';
      showToast(`"${name}" created!`, 'success');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  });
  document.getElementById('new-list-name').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('create-list-btn').click(); });

  // List detail nav
  document.getElementById('back-to-lists').addEventListener('click', () => {
    if (unsubItems) { unsubItems(); unsubItems = null; }
    currentListId = null; setHashListId(null);
    navigateTo('lists');
    document.getElementById('header-title').textContent = 'My Lists';
  });
  document.getElementById('detail-delete-btn').addEventListener('click', () => { if (currentListId) confirmDelete('list', currentListId); });

  // Add item (quick bar)
  document.getElementById('new-item-name').addEventListener('keydown', e => {
    if (e.key === 'Enter') { openAddItemModal(e.target.value.trim()); e.target.value = ''; }
  });
  document.getElementById('add-item-quick-btn').addEventListener('click', () => {
    const input = document.getElementById('new-item-name');
    openAddItemModal(input.value.trim()); input.value = '';
  });
  document.getElementById('save-item-btn').addEventListener('click', async () => {
    const name = document.getElementById('item-name-full').value.trim();
    if (!name) { showToast('Item name is required', 'error'); return; }
    if (!currentListId) { showToast('No list selected', 'error'); return; }
    const tags = document.getElementById('item-tags').value.split(',').map(s=>s.trim()).filter(Boolean);
    try {
      await addDoc(itemsCol(currentListId), { name, qty:document.getElementById('item-qty').value.trim(), unit:document.getElementById('item-unit').value.trim(), stores:getSelectedStores(), tags, notes:document.getElementById('item-notes').value.trim(), checked:false, createdAt:serverTimestamp() });
      closeModal('modal-add-item');
      ['item-name-full','item-qty','item-unit','item-tags','item-notes'].forEach(id => document.getElementById(id).value = '');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  });
  document.getElementById('item-name-full').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('save-item-btn').click(); });

  // Template editor
  document.getElementById('new-template-btn').addEventListener('click', () => openTemplateEditor(null));
  document.getElementById('tpl-add-item-btn').addEventListener('click', () => openTplItemModal(-1));
  document.getElementById('tpl-save-btn').addEventListener('click', async () => {
    const name = document.getElementById('tpl-name').value.trim();
    if (!name) { showToast('Template name is required', 'error'); return; }
    const data = {
      name,
      emoji: document.getElementById('tpl-emoji').value.trim() || '📋',
      desc:  document.getElementById('tpl-desc').value.trim(),
      items: tplEditorItems,
      updatedAt: serverTimestamp()
    };
    try {
      if (editingTemplateId) {
        await updateDoc(doc(templatesCol(), editingTemplateId), data);
        showToast('Template saved!', 'success');
      } else {
        data.createdAt = serverTimestamp();
        await addDoc(templatesCol(), data);
        showToast(`"${name}" template created!`, 'success');
      }
      closeModal('modal-template-editor');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  });
  document.getElementById('tpl-delete-btn').addEventListener('click', () => {
    if (!editingTemplateId) return;
    pendingDelete = { type: 'template', id: editingTemplateId };
    document.getElementById('confirm-title').textContent   = 'Delete Template?';
    document.getElementById('confirm-message').textContent = 'This template will be permanently deleted.';
    closeModal('modal-template-editor');
    openModal('modal-confirm');
  });

  // Template item modal — Save button
  document.getElementById('tpl-item-save-btn').addEventListener('click', saveTplItem);
  document.getElementById('tpl-item-name').addEventListener('keydown', e => { if (e.key === 'Enter') saveTplItem(); });

  // Categories
  document.getElementById('new-category-btn').addEventListener('click', () => openModal('modal-new-category'));
  document.getElementById('save-category-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-category-name').value.trim();
    if (!name) { showToast('Category name is required', 'error'); return; }
    try {
      await addDoc(categoriesCol(), { name, emoji: document.getElementById('new-category-emoji').value.trim(), createdAt: serverTimestamp() });
      closeModal('modal-new-category');
      document.getElementById('new-category-name').value  = '';
      document.getElementById('new-category-emoji').value = '';
      showToast(`"${name}" added!`, 'success');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  });
  document.getElementById('new-category-name').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('save-category-btn').click(); });

  // Stores
  document.getElementById('new-store-btn').addEventListener('click', () => openModal('modal-new-store'));
  document.getElementById('save-store-btn').addEventListener('click', async () => {
    const name = document.getElementById('new-store-name').value.trim();
    if (!name) { showToast('Store name is required', 'error'); return; }
    try {
      await addDoc(storesCol(), { name, createdAt: serverTimestamp() });
      closeModal('modal-new-store');
      document.getElementById('new-store-name').value = '';
      showToast(`"${name}" added!`, 'success');
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  });
  document.getElementById('new-store-name').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('save-store-btn').click(); });

  // Confirm dialog
  document.getElementById('confirm-ok-btn').addEventListener('click', async () => {
    if (!pendingDelete) return;
    const { type, id } = pendingDelete;
    closeModal('modal-confirm');
    try {
      if (type === 'list') {
        const itemSnap = await getDocs(itemsCol(id));
        const batch = writeBatch(db);
        itemSnap.docs.forEach(d => batch.delete(d.ref));
        batch.delete(doc(listsCol(), id));
        await batch.commit();
        if (currentListId === id) {
          if (unsubItems) { unsubItems(); unsubItems = null; }
          currentListId = null; setHashListId(null); navigateTo('lists');
          document.getElementById('header-title').textContent = 'My Lists';
        }
        showToast('List deleted', 'success');
      } else if (type === 'category') { await deleteDoc(doc(categoriesCol(), id)); showToast('Category deleted', 'success'); }
      else if (type === 'template')  { await deleteDoc(doc(templatesCol(),  id)); showToast('Template deleted', 'success'); }
      else if (type === 'store')     { await deleteDoc(doc(storesCol(),     id)); showToast('Store deleted',    'success'); }
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
    pendingDelete = null;
  });

  // Navigation
  document.querySelectorAll('[data-view]').forEach(el => el.addEventListener('click', () => { const v = el.dataset.view; if (v !== 'list-detail') navigateTo(v); }));
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('mobile-open');
    document.getElementById('sidebar-backdrop').classList.toggle('open');
  });
  document.getElementById('sidebar-backdrop').addEventListener('click', closeSidebar);

  // Click-outside-to-close on all modals
  document.querySelectorAll('.modal-overlay').forEach(overlay =>
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.classList.remove('open'); })
  );

  loadBuildMeta();
  createIcons();
});

function updateUserUI() {
  if (!currentUser) return;
  const initials = (currentUser.displayName || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  ['sidebar-avatar', 'settings-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (currentUser.photoURL) el.innerHTML = `<img src="${currentUser.photoURL}" alt="Avatar">`;
    else el.textContent = initials;
  });
  document.getElementById('sidebar-name').textContent  = currentUser.displayName || 'User';
  document.getElementById('sidebar-email').textContent = currentUser.email || '';
  document.getElementById('settings-name').textContent  = currentUser.displayName || 'User';
  document.getElementById('settings-email').textContent = currentUser.email || '';
}

async function toggleItem(itemId) {
  const item = allItems.find(i => i.id === itemId);
  if (!item || !currentListId) return;
  try { await updateDoc(doc(itemsCol(currentListId), itemId), { checked: !item.checked }); }
  catch (e) { showToast('Error: ' + e.message, 'error'); }
}
async function deleteItem(itemId) {
  if (!currentListId) return;
  try { await deleteDoc(doc(itemsCol(currentListId), itemId)); }
  catch (e) { showToast('Error: ' + e.message, 'error'); }
}
