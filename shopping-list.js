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
let pendingDelete = null;

// Track pending list to open after lists first load (for hash-based restore)
let pendingListId = null;

// ── Hash-based list restore ────────────────────────────────────────────────
function getHashListId() {
  const hash = window.location.hash; // e.g. #list/abc123
  const m = hash.match(/^#list\/(.+)$/);
  return m ? m[1] : null;
}

function setHashListId(listId) {
  history.replaceState(null, '', listId ? `#list/${listId}` : '#');
}

// ── Seed Data ──────────────────────────────────────────────────────────────
const SEED_TEMPLATES = [
  { emoji:'🛒', name:'Weekly Groceries', desc:'Everyday essentials for the week',
    items:[{name:'Milk',qty:'1 gal',stores:[],tags:[]},{name:'Eggs',qty:'1 doz',stores:[],tags:[]},{name:'Bread',qty:'1 loaf',stores:[],tags:[]},{name:'Butter',qty:'',stores:[],tags:[]},{name:'Cheese',qty:'',stores:[],tags:[]},{name:'Chicken breast',qty:'2 lbs',stores:[],tags:[]},{name:'Pasta',qty:'1 box',stores:[],tags:[]},{name:'Rice',qty:'',stores:[],tags:[]},{name:'Olive oil',qty:'',stores:[],tags:[]},{name:'Bananas',qty:'',stores:[],tags:[]},{name:'Spinach',qty:'',stores:[],tags:[]}] },
  { emoji:'🥩', name:'BBQ & Grilling', desc:'Everything you need for a backyard cookout',
    items:[{name:'Burgers',qty:'2 lbs',stores:[],tags:[]},{name:'Hot dogs',qty:'1 pkg',stores:[],tags:[]},{name:'Chicken wings',qty:'3 lbs',stores:[],tags:[]},{name:'Buns',qty:'1 pkg',stores:[],tags:[]},{name:'Ketchup',qty:'',stores:[],tags:[]},{name:'Mustard',qty:'',stores:[],tags:[]},{name:'BBQ sauce',qty:'',stores:[],tags:[]},{name:'Corn on the cob',qty:'6',stores:[],tags:[]}] },
  { emoji:'🎉', name:'Party Supplies', desc:'Stock up for a gathering or celebration',
    items:[{name:'Chips & dip',qty:'',stores:[],tags:['snacks']},{name:'Soda',qty:'2 cases',stores:[],tags:['beverages']},{name:'Ice',qty:'2 bags',stores:[],tags:[]},{name:'Plates',qty:'50',stores:[],tags:['supplies']},{name:'Cups',qty:'50',stores:[],tags:['supplies']},{name:'Napkins',qty:'1 pkg',stores:[],tags:['supplies']}] },
  { emoji:'🏠', name:'Household Basics', desc:'Cleaning and home essentials',
    items:[{name:'Paper towels',qty:'6 rolls',stores:[],tags:['cleaning']},{name:'Toilet paper',qty:'12 rolls',stores:[],tags:[]},{name:'Dish soap',qty:'1 bottle',stores:[],tags:['cleaning']},{name:'Laundry detergent',qty:'',stores:[],tags:['cleaning']},{name:'Trash bags',qty:'1 box',stores:[],tags:[]},{name:'Sponges',qty:'',stores:[],tags:['cleaning']}] },
  { emoji:'🥗', name:'Healthy Eating', desc:'Fresh produce and wholesome staples',
    items:[{name:'Kale',qty:'1 bunch',stores:[],tags:['produce','organic']},{name:'Spinach',qty:'1 bag',stores:[],tags:['produce']},{name:'Broccoli',qty:'1 head',stores:[],tags:['produce']},{name:'Avocados',qty:'4',stores:[],tags:['produce']},{name:'Blueberries',qty:'1 pint',stores:[],tags:['produce']},{name:'Greek yogurt',qty:'',stores:[],tags:['dairy']},{name:'Quinoa',qty:'1 bag',stores:[],tags:[]},{name:'Salmon',qty:'1 lb',stores:[],tags:['seafood']},{name:'Almonds',qty:'1 bag',stores:[],tags:['snacks']}] },
  { emoji:'🍝', name:'Pasta Night', desc:'Ingredients for a classic Italian dinner',
    items:[{name:'Spaghetti',qty:'1 box',stores:[],tags:[]},{name:'Marinara sauce',qty:'1 jar',stores:[],tags:[]},{name:'Ground beef',qty:'1 lb',stores:[],tags:[]},{name:'Parmesan cheese',qty:'',stores:[],tags:['dairy']},{name:'Garlic',qty:'1 head',stores:[],tags:['produce']},{name:'Olive oil',qty:'',stores:[],tags:[]},{name:'Fresh basil',qty:'1 bunch',stores:[],tags:['produce']}] },
  { emoji:'🥞', name:'Breakfast Week', desc:'Morning staples to start every day right',
    items:[{name:'Eggs',qty:'2 doz',stores:[],tags:[]},{name:'Bacon',qty:'1 pkg',stores:[],tags:[]},{name:'Bread',qty:'1 loaf',stores:[],tags:[]},{name:'Butter',qty:'',stores:[],tags:[]},{name:'Milk',qty:'1 gal',stores:[],tags:['dairy']},{name:'Orange juice',qty:'1 jug',stores:[],tags:['beverages']},{name:'Coffee',qty:'1 bag',stores:[],tags:['beverages']},{name:'Oats',qty:'1 box',stores:[],tags:[]},{name:'Maple syrup',qty:'',stores:[],tags:[]}] },
  { emoji:'🎒', name:'Back to School', desc:'Lunches and snacks for busy school days',
    items:[{name:'Sandwich bread',qty:'1 loaf',stores:[],tags:[]},{name:'Peanut butter',qty:'1 jar',stores:[],tags:[]},{name:'Jelly',qty:'1 jar',stores:[],tags:[]},{name:'Apple',qty:'6',stores:[],tags:['produce']},{name:'Granola bars',qty:'1 box',stores:[],tags:['snacks']},{name:'Juice boxes',qty:'1 box',stores:[],tags:['beverages']},{name:'String cheese',qty:'1 pkg',stores:[],tags:['dairy']}] }
];

// ── Utility ────────────────────────────────────────────────────────────────
function escHtml(str) {
  return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// Normalise legacy string store/tags fields to arrays
function toArray(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string' && val.trim()) return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

// ── Theme ──────────────────────────────────────────────────────────────────
const html = document.documentElement;
let currentTheme = 'light';
html.setAttribute('data-theme', currentTheme);
syncThemeUI();

function syncThemeUI() {
  const btn = document.getElementById('theme-toggle');
  const toggle = document.getElementById('dark-mode-toggle');
  if (btn) btn.innerHTML = currentTheme === 'dark'
    ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
    : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  if (toggle) toggle.checked = currentTheme === 'dark';
}

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', currentTheme);
  syncThemeUI();
}

document.getElementById('theme-toggle').addEventListener('click', toggleTheme);
document.getElementById('dark-mode-toggle').addEventListener('change', toggleTheme);

// ── Auth ───────────────────────────────────────────────────────────────────
const provider = new GoogleAuthProvider();

document.getElementById('google-signin-btn').addEventListener('click', async () => {
  document.getElementById('auth-body').style.display = 'none';
  document.getElementById('auth-loading').style.display = 'flex';
  try {
    await signInWithPopup(auth, provider);
  } catch (e) {
    document.getElementById('auth-body').style.display = 'block';
    document.getElementById('auth-loading').style.display = 'none';
    showToast('Sign-in failed: ' + e.message, 'error');
  }
});

document.getElementById('signout-btn').addEventListener('click', async () => {
  await signOut(auth);
  showToast('Signed out', 'info');
});

onAuthStateChanged(auth, user => {
  if (user) {
    currentUser = user;
    document.getElementById('auth-screen').style.display = 'none';
    document.getElementById('app').style.display = 'block';
    updateUserUI();
    // Capture hash list id before subscribeToData clears state
    pendingListId = getHashListId();
    subscribeToData();
    lucide.createIcons();
  } else {
    currentUser = null;
    document.getElementById('app').style.display = 'none';
    document.getElementById('auth-screen').style.display = 'flex';
    document.getElementById('auth-body').style.display = 'block';
    document.getElementById('auth-loading').style.display = 'none';
    teardownSubscriptions();
  }
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
  document.getElementById('sidebar-name').textContent = currentUser.displayName || 'User';
  document.getElementById('sidebar-email').textContent = currentUser.email || '';
  document.getElementById('settings-name').textContent = currentUser.displayName || 'User';
  document.getElementById('settings-email').textContent = currentUser.email || '';
}

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
      { name: 'Produce', emoji: '🥦' },
      { name: 'Dairy', emoji: '🧀' },
      { name: 'Meat & Seafood', emoji: '🥩' },
      { name: 'Bakery', emoji: '🍞' },
      { name: 'Frozen', emoji: '🧊' },
      { name: 'Beverages', emoji: '🥤' },
      { name: 'Snacks', emoji: '🍿' },
      { name: 'Household', emoji: '🧹' },
      { name: 'Personal Care', emoji: '🧴' },
      { name: 'Other', emoji: '📦' },
    ];
    const batch = writeBatch(db);
    defaults.forEach(cat => {
      batch.set(doc(categoriesCol()), { ...cat, createdAt: serverTimestamp() });
    });
    await batch.commit();
  }
  const storeSnap = await getDocs(storesCol());
  if (storeSnap.empty) {
    const defaults = ['Walmart', 'Target', 'Whole Foods', 'Costco', "Trader Joe's", 'Stop & Shop', "Shaw's", 'Market Basket'];
    const batch = writeBatch(db);
    defaults.forEach(name => {
      batch.set(doc(storesCol()), { name, createdAt: serverTimestamp() });
    });
    await batch.commit();
  }
}

async function seedTemplatesIfNeeded() {
  const snap = await getDocs(templatesCol());
  if (snap.empty) {
    const batch = writeBatch(db);
    SEED_TEMPLATES.forEach(t => {
      batch.set(doc(templatesCol()), { ...t, createdAt: serverTimestamp() });
    });
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
    populateTplStoreSelects();
  });

  unsubLists = onSnapshot(query(listsCol(), orderBy('createdAt', 'desc')), snap => {
    allLists = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderLists();
    document.getElementById('badge-lists').textContent = allLists.length;

    // On first load, restore the list the user was viewing before refresh
    if (listsFirstLoad) {
      listsFirstLoad = false;
      const restoreId = pendingListId;
      pendingListId = null;
      if (restoreId && allLists.find(l => l.id === restoreId)) {
        openList(restoreId);
      }
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
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-state-icon"><i data-lucide="layout-template"></i></div>
      <h3>No templates yet</h3>
      <p>Create a template to quickly start new lists.</p>
    </div>`;
    lucide.createIcons(); return;
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
      <div>
        <div class="template-card-title">${escHtml(t.name)}</div>
        <div class="template-card-desc">${escHtml(t.desc || '')}</div>
      </div>
      <div class="template-card-items">${chips}${moreChip}</div>
      <div class="template-card-footer">
        <span class="template-item-count">${items.length} item${items.length !== 1 ? 's' : ''}</span>
        <button class="btn btn-primary" data-use-tpl="${t.id}"><i data-lucide="plus"></i> Use Template</button>
      </div>
    </div>`;
  }).join('');

  grid.querySelectorAll('[data-use-tpl]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); useTemplate(btn.dataset.useTpl); });
  });
  grid.querySelectorAll('[data-edit-tpl]').forEach(btn => {
    btn.addEventListener('click', e => { e.stopPropagation(); openTemplateEditor(btn.dataset.editTpl); });
  });
  lucide.createIcons();
}

async function useTemplate(tplId) {
  const tpl = allTemplates.find(t => t.id === tplId);
  if (!tpl || !currentUser) return;
  const items = tpl.items || [];
  try {
    const listRef = await addDoc(listsCol(), {
      name: tpl.name, storeName: '', itemCount: items.length, checkedCount: 0, createdAt: serverTimestamp()
    });
    const batch = writeBatch(db);
    items.forEach(it => {
      const name = typeof it === 'string' ? it : (it.name || '');
      const qty = typeof it === 'object' ? (it.qty || '') : '';
      const stores = toArray(typeof it === 'object' ? it.stores : []);
      const tags = toArray(typeof it === 'object' ? it.tags : []);
      batch.set(doc(itemsCol(listRef.id)), { name, qty, unit:'', stores, tags, notes:'', checked:false, createdAt: serverTimestamp() });
    });
    await batch.commit();
    showToast(`"${tpl.name}" created with ${items.length} items!`, 'success');
    navigateTo('lists');
    setTimeout(() => openList(listRef.id), 300);
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

function openTemplateEditor(tplId) {
  editingTemplateId = tplId || null;
  const tpl = tplId ? allTemplates.find(t => t.id === tplId) : null;
  document.getElementById('tpl-editor-title').textContent = tpl ? 'Edit Template' : 'New Template';
  document.getElementById('tpl-emoji').value = tpl ? (tpl.emoji || '') : '';
  document.getElementById('tpl-name').value = tpl ? tpl.name : '';
  document.getElementById('tpl-desc').value = tpl ? (tpl.desc || '') : '';
  document.getElementById('tpl-delete-btn').style.display = tpl ? 'inline-flex' : 'none';
  tplEditorItems = tpl ? (tpl.items || []).map(it =>
    typeof it === 'string'
      ? {name:it, qty:'', stores:[], tags:[]}
      : {name:it.name||'', qty:it.qty||'', stores:toArray(it.stores), tags:toArray(it.tags)}
  ) : [];
  populateTplStoreSelects();
  renderTplEditorItems();
  openModal('modal-template-editor');
}

function populateTplStoreSelects() {
  const opts = '<option value="">No store</option>' + allStores.map(s => `<option value="${escHtml(s.name)}">${escHtml(s.name)}</option>`).join('');
  document.getElementById('tpl-new-item-store').innerHTML = opts;
  document.querySelectorAll('.tpl-item-store-sel').forEach(sel => { const v = sel.value; sel.innerHTML = opts; sel.value = v; });
}

function renderTplEditorItems() {
  const container = document.getElementById('tpl-editor-items');
  if (tplEditorItems.length === 0) {
    container.innerHTML = `<div style="font-size:var(--text-xs);color:var(--color-text-faint);text-align:center;padding:var(--space-4);">No items yet — add one below</div>`;
    return;
  }
  const storeOpts = '<option value="">No store</option>' + allStores.map(s => `<option value="${escHtml(s.name)}">${escHtml(s.name)}</option>`).join('');
  container.innerHTML = tplEditorItems.map((it, i) => `
    <div class="tpl-editor-item">
      <input class="item-name-input" type="text" value="${escHtml(it.name)}" placeholder="Item name" data-idx="${i}" data-field="name">
      <input class="item-qty-input" type="text" value="${escHtml(it.qty||'')}" placeholder="Qty" data-idx="${i}" data-field="qty">
      <select class="item-store-select tpl-item-store-sel" data-idx="${i}" data-field="store">${storeOpts}</select>
      <input class="item-tags-input" type="text" value="${escHtml((it.tags||[]).join(', '))}" placeholder="Tags" data-idx="${i}" data-field="tags">
      <button class="icon-btn" data-remove-idx="${i}" aria-label="Remove item" style="color:var(--color-error);"><i data-lucide="x"></i></button>
    </div>`).join('');

  container.querySelectorAll('.tpl-item-store-sel').forEach(sel => {
    const i = parseInt(sel.dataset.idx);
    sel.value = (tplEditorItems[i].stores || [])[0] || '';
  });
  container.querySelectorAll('input[data-field],select[data-field]').forEach(el => {
    el.addEventListener('input', () => {
      const i = parseInt(el.dataset.idx);
      const field = el.dataset.field;
      if (field === 'tags') tplEditorItems[i].tags = el.value.split(',').map(s=>s.trim()).filter(Boolean);
      else if (field === 'store') tplEditorItems[i].stores = el.value ? [el.value] : [];
      else tplEditorItems[i][field] = el.value;
    });
    el.addEventListener('change', () => {
      const i = parseInt(el.dataset.idx);
      const field = el.dataset.field;
      if (field === 'tags') tplEditorItems[i].tags = el.value.split(',').map(s=>s.trim()).filter(Boolean);
      else if (field === 'store') tplEditorItems[i].stores = el.value ? [el.value] : [];
      else tplEditorItems[i][field] = el.value;
    });
  });
  container.querySelectorAll('[data-remove-idx]').forEach(btn => {
    btn.addEventListener('click', () => { tplEditorItems.splice(parseInt(btn.dataset.removeIdx), 1); renderTplEditorItems(); });
  });
  lucide.createIcons();
}

document.getElementById('tpl-add-item-btn').addEventListener('click', () => {
  const nameEl = document.getElementById('tpl-new-item-name');
  const name = nameEl.value.trim();
  if (!name) { nameEl.focus(); return; }
  const storeVal = document.getElementById('tpl-new-item-store').value;
  tplEditorItems.push({
    name,
    qty: document.getElementById('tpl-new-item-qty').value.trim(),
    stores: storeVal ? [storeVal] : [],
    tags: document.getElementById('tpl-new-item-tags').value.split(',').map(s=>s.trim()).filter(Boolean)
  });
  nameEl.value = '';
  document.getElementById('tpl-new-item-qty').value = '';
  document.getElementById('tpl-new-item-store').value = '';
  document.getElementById('tpl-new-item-tags').value = '';
  renderTplEditorItems();
  nameEl.focus();
});

document.getElementById('tpl-new-item-name').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('tpl-add-item-btn').click(); });

document.getElementById('tpl-save-btn').addEventListener('click', async () => {
  const name = document.getElementById('tpl-name').value.trim();
  if (!name) { showToast('Template name is required', 'error'); return; }
  const data = {
    name,
    emoji: document.getElementById('tpl-emoji').value.trim() || '📋',
    desc: document.getElementById('tpl-desc').value.trim(),
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
  document.getElementById('confirm-title').textContent = 'Delete Template?';
  document.getElementById('confirm-message').textContent = 'This template will be permanently deleted.';
  closeModal('modal-template-editor');
  openModal('modal-confirm');
});

document.getElementById('new-template-btn').addEventListener('click', () => openTemplateEditor(null));

// ── Lists ──────────────────────────────────────────────────────────────────
function renderLists() {
  const grid = document.getElementById('lists-grid');
  const query_ = document.getElementById('search-lists').value.toLowerCase();
  const filtered = allLists.filter(l => l.name.toLowerCase().includes(query_));
  const sub = document.getElementById('lists-subtitle');
  sub.textContent = allLists.length === 1 ? '1 list' : `${allLists.length} lists`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-state-icon"><i data-lucide="shopping-cart"></i></div>
      <h3>${query_ ? 'No matching lists' : 'No lists yet'}</h3>
      <p>${query_ ? 'Try a different search.' : 'Create your first shopping list to get started.'}</p>
      ${!query_ ? '<button class="btn btn-primary" id="empty-new-list-btn"><i data-lucide="plus"></i> New List</button>' : ''}
    </div>`;
    document.getElementById('empty-new-list-btn')?.addEventListener('click', () => openModal('modal-new-list'));
    lucide.createIcons();
    return;
  }

  grid.innerHTML = filtered.map(list => {
    const total = list.itemCount || 0;
    const checked = list.checkedCount || 0;
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    const isDone = total > 0 && checked === total;
    const badge = isDone
      ? `<span class="badge badge-success">Done</span>`
      : `<span class="badge badge-primary">Active</span>`;
    const storeName = list.storeName ? `<span>${list.storeName}</span>` : '';
    return `<div class="list-card" data-id="${list.id}">
      <div class="list-card-actions">
        <button class="icon-btn" data-delete-list="${list.id}" aria-label="Delete list" title="Delete list" style="color:var(--color-error)"><i data-lucide="trash-2"></i></button>
      </div>
      <div class="list-card-header">
        <div>
          <div class="list-card-title">${escHtml(list.name)}</div>
          <div class="list-card-meta">${storeName}<span>${total} item${total !== 1 ? 's' : ''}</span><span>${checked} checked</span></div>
        </div>${badge}
      </div>
      <div class="list-card-progress"><div class="list-card-progress-bar" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.list-card').forEach(card => {
    card.addEventListener('click', e => {
      if (e.target.closest('[data-delete-list]')) return;
      openList(card.dataset.id);
    });
  });
  grid.querySelectorAll('[data-delete-list]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      confirmDelete('list', btn.dataset.deleteList);
    });
  });
  lucide.createIcons();
}

document.getElementById('search-lists').addEventListener('input', renderLists);
document.getElementById('new-list-btn').addEventListener('click', () => openModal('modal-new-list'));
document.getElementById('header-add-btn').addEventListener('click', () => {
  const view = document.querySelector('.view.active')?.id?.replace('view-', '');
  if (view === 'lists') openModal('modal-new-list');
  else if (view === 'categories') openModal('modal-new-category');
  else if (view === 'stores') openModal('modal-new-store');
  else if (view === 'templates') openTemplateEditor(null);
});

document.getElementById('create-list-btn').addEventListener('click', async () => {
  const name = document.getElementById('new-list-name').value.trim();
  if (!name) { showToast('Please enter a list name', 'error'); return; }
  const storeEl = document.getElementById('new-list-store');
  const storeName = storeEl.value || '';
  try {
    await addDoc(listsCol(), { name, storeName, itemCount: 0, checkedCount: 0, createdAt: serverTimestamp() });
    closeModal('modal-new-list');
    document.getElementById('new-list-name').value = '';
    document.getElementById('new-list-store').value = '';
    showToast(`"${name}" created!`, 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
});

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

document.getElementById('back-to-lists').addEventListener('click', () => {
  if (unsubItems) { unsubItems(); unsubItems = null; }
  currentListId = null;
  setHashListId(null);
  navigateTo('lists');
  document.getElementById('header-title').textContent = 'My Lists';
});

document.getElementById('detail-delete-btn').addEventListener('click', () => {
  if (currentListId) confirmDelete('list', currentListId);
});

function renderItems() {
  const list_ = document.getElementById('items-list');
  const empty = document.getElementById('items-empty');
  const unchecked = allItems.filter(i => !i.checked);
  const checked = allItems.filter(i => i.checked);
  const total = allItems.length;
  const doneCount = checked.length;
  const pct = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  document.getElementById('progress-bar').style.width = pct + '%';
  document.getElementById('progress-label').textContent = `${doneCount} of ${total} checked`;

  if (total === 0) {
    empty.style.display = 'flex';
    list_.innerHTML = '';
    return;
  }
  empty.style.display = 'none';

  const renderGroup = (items) => items.map(item => {
    const qty = item.qty ? `<span class="item-qty-badge">${escHtml(item.qty)}${item.unit ? ' ' + escHtml(item.unit) : ''}</span>` : '';
    const stores = toArray(item.stores);
    const tags = toArray(item.tags);
    const storeChips = stores.map(s => `<span class="item-store-chip"><i data-lucide="store" style="width:10px;height:10px;"></i>${escHtml(s)}</span>`).join('');
    const tagChips = tags.map(t => `<span class="item-tag-chip">${escHtml(t)}</span>`).join('');
    const notes = item.notes ? `<span style="color:var(--color-text-faint);font-size:var(--text-xs);">${escHtml(item.notes)}</span>` : '';
    const metaParts = [qty, storeChips, tagChips, notes].filter(Boolean).join('');
    return `<div class="item-row${item.checked ? ' checked' : ''}" data-item-id="${item.id}">
      <div class="item-checkbox${item.checked ? ' checked' : ''}" data-toggle="${item.id}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
      </div>
      <div class="item-info">
        <div class="item-name">${escHtml(item.name)}</div>
        ${metaParts ? `<div class="item-meta">${metaParts}</div>` : ''}
      </div>
      <button class="icon-btn item-delete" data-delete-item="${item.id}" aria-label="Delete item" style="color:var(--color-error);"><i data-lucide="x"></i></button>
    </div>`;
  }).join('');

  let html_ = '';
  if (unchecked.length > 0) html_ += renderGroup(unchecked);
  if (checked.length > 0) {
    html_ += `<div class="items-section-label">Checked (${checked.length})</div>`;
    html_ += renderGroup(checked);
  }
  list_.innerHTML = html_;

  list_.querySelectorAll('[data-toggle]').forEach(el => {
    el.addEventListener('click', () => toggleItem(el.dataset.toggle));
  });
  list_.querySelectorAll('[data-delete-item]').forEach(btn => {
    btn.addEventListener('click', () => deleteItem(btn.dataset.deleteItem));
  });
  lucide.createIcons();
}

async function updateListCounts(listId) {
  const total = allItems.length;
  const checked = allItems.filter(i => i.checked).length;
  try {
    await updateDoc(doc(listsCol(), listId), { itemCount: total, checkedCount: checked });
  } catch {}
}

// ── Item Store Checkboxes ──────────────────────────────────────────────────
function populateItemStoreCheckboxes(selectedStores = []) {
  const container = document.getElementById('item-store-checkboxes');
  if (!container) return;
  if (allStores.length === 0) {
    container.innerHTML = `<span style="font-size:var(--text-xs);color:var(--color-text-faint);">No stores yet — add some in the Stores view.</span>`;
    return;
  }
  container.innerHTML = allStores.map(s => {
    const checked = selectedStores.includes(s.name) ? 'checked' : '';
    return `<label class="store-checkbox-label">
      <input type="checkbox" value="${escHtml(s.name)}" ${checked}>
      <span>${escHtml(s.name)}</span>
    </label>`;
  }).join('');
}

function getSelectedStores() {
  const container = document.getElementById('item-store-checkboxes');
  if (!container) return [];
  return Array.from(container.querySelectorAll('input[type=checkbox]:checked')).map(cb => cb.value);
}

// ── Add Item Handlers ──────────────────────────────────────────────────────
document.getElementById('new-item-name').addEventListener('keydown', e => {
  if (e.key === 'Enter') addItemQuick();
});
document.getElementById('add-item-quick-btn').addEventListener('click', addItemQuick);

async function addItemQuick() {
  const input = document.getElementById('new-item-name');
  const name = input.value.trim();
  if (!name) return;
  if (!currentListId) {
    showToast('No list selected — please open a list first', 'error');
    return;
  }
  try {
    await addDoc(itemsCol(currentListId), {
      name, checked: false, qty: '', unit: '', stores: [], tags: [], notes: '', createdAt: serverTimestamp()
    });
    input.value = '';
    input.focus();
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

document.getElementById('add-item-detail-btn').addEventListener('click', () => {
  if (!currentListId) {
    showToast('No list selected — please open a list first', 'error');
    return;
  }
  document.getElementById('item-name-full').value = document.getElementById('new-item-name').value;
  populateItemStoreCheckboxes();
  document.getElementById('item-tags').value = '';
  document.getElementById('item-notes').value = '';
  openModal('modal-add-item');
  document.getElementById('item-name-full').focus();
});

document.getElementById('save-item-btn').addEventListener('click', async () => {
  const name = document.getElementById('item-name-full').value.trim();
  if (!name) { showToast('Item name is required', 'error'); return; }
  if (!currentListId) { showToast('No list selected', 'error'); return; }
  const stores = getSelectedStores();
  const tagsRaw = document.getElementById('item-tags').value;
  const tags = tagsRaw.split(',').map(s => s.trim()).filter(Boolean);
  try {
    await addDoc(itemsCol(currentListId), {
      name,
      qty: document.getElementById('item-qty').value.trim(),
      unit: document.getElementById('item-unit').value.trim(),
      stores,
      tags,
      notes: document.getElementById('item-notes').value.trim(),
      checked: false,
      createdAt: serverTimestamp()
    });
    closeModal('modal-add-item');
    document.getElementById('new-item-name').value = '';
    ['item-name-full','item-qty','item-unit','item-tags','item-notes'].forEach(id => document.getElementById(id).value = '');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
});

async function toggleItem(itemId) {
  const item = allItems.find(i => i.id === itemId);
  if (!item || !currentListId) return;
  try {
    await updateDoc(doc(itemsCol(currentListId), itemId), { checked: !item.checked });
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

async function deleteItem(itemId) {
  if (!currentListId) return;
  try {
    await deleteDoc(doc(itemsCol(currentListId), itemId));
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
}

// ── Categories ─────────────────────────────────────────────────────────────
function renderCategories() {
  const grid = document.getElementById('categories-grid');
  if (allCategories.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><i data-lucide="tag"></i></div><h3>No categories</h3><p>Add a category to organize your items.</p></div>`;
    lucide.createIcons(); return;
  }
  grid.innerHTML = allCategories.map(cat => `
    <div class="card">
      <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:var(--text-sm);font-weight:500;">${cat.emoji || ''} ${escHtml(cat.name)}</span>
        <button class="icon-btn" data-delete-cat="${cat.id}" aria-label="Delete" style="color:var(--color-error);"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`).join('');
  grid.querySelectorAll('[data-delete-cat]').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete('category', btn.dataset.deleteCat));
  });
  lucide.createIcons();
}

document.getElementById('new-category-btn').addEventListener('click', () => openModal('modal-new-category'));
document.getElementById('save-category-btn').addEventListener('click', async () => {
  const name = document.getElementById('new-category-name').value.trim();
  if (!name) { showToast('Category name is required', 'error'); return; }
  const emoji = document.getElementById('new-category-emoji').value.trim();
  try {
    await addDoc(categoriesCol(), { name, emoji, createdAt: serverTimestamp() });
    closeModal('modal-new-category');
    document.getElementById('new-category-name').value = '';
    document.getElementById('new-category-emoji').value = '';
    showToast(`"${name}" added!`, 'success');
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
});

// ── Stores ─────────────────────────────────────────────────────────────────
function renderStores() {
  const grid = document.getElementById('stores-grid');
  if (allStores.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;"><div class="empty-state-icon"><i data-lucide="store"></i></div><h3>No stores</h3><p>Add your favorite grocery stores.</p></div>`;
    lucide.createIcons(); return;
  }
  grid.innerHTML = allStores.map(store => `
    <div class="card">
      <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:var(--text-sm);font-weight:600;">${escHtml(store.name)}</div>
        <button class="icon-btn" data-delete-store="${store.id}" aria-label="Delete" style="color:var(--color-error);"><i data-lucide="trash-2"></i></button>
      </div>
    </div>`).join('');
  grid.querySelectorAll('[data-delete-store]').forEach(btn => {
    btn.addEventListener('click', () => confirmDelete('store', btn.dataset.deleteStore));
  });
  lucide.createIcons();
}

function populateStoreSelect() {
  const sel = document.getElementById('new-list-store');
  sel.innerHTML = '<option value="">No default store</option>' +
    allStores.map(s => `<option value="${escHtml(s.name)}">${escHtml(s.name)}</option>`).join('');
}

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

// ── Delete (with confirm) ──────────────────────────────────────────────────
function confirmDelete(type, id) {
  pendingDelete = { type, id };
  const titles = { list: 'Delete List?', category: 'Delete Category?', store: 'Delete Store?', template: 'Delete Template?' };
  const msgs = {
    list: 'This will permanently delete the list and all its items.',
    category: 'This category will be removed from all items.',
    store: 'This store will be removed.',
    template: 'This template will be permanently deleted.'
  };
  document.getElementById('confirm-title').textContent = titles[type];
  document.getElementById('confirm-message').textContent = msgs[type];
  openModal('modal-confirm');
}

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
        currentListId = null;
        setHashListId(null);
        navigateTo('lists');
        document.getElementById('header-title').textContent = 'My Lists';
      }
      showToast('List deleted', 'success');
    } else if (type === 'category') {
      await deleteDoc(doc(categoriesCol(), id));
      showToast('Category deleted', 'success');
    } else if (type === 'template') {
      await deleteDoc(doc(templatesCol(), id));
      showToast('Template deleted', 'success');
    } else if (type === 'store') {
      await deleteDoc(doc(storesCol(), id));
      showToast('Store deleted', 'success');
    }
  } catch (e) { showToast('Error: ' + e.message, 'error'); }
  pendingDelete = null;
});

// ── Navigation ─────────────────────────────────────────────────────────────
const viewTitles = { lists: 'My Lists', 'list-detail': '', templates: 'Templates', categories: 'Categories', stores: 'Stores', settings: 'Settings' };

function navigateTo(view) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.add('active');
  document.querySelectorAll(`[data-view="${view}"]`).forEach(n => n.classList.add('active'));
  if (viewTitles[view] !== undefined && viewTitles[view] !== '') {
    document.getElementById('header-title').textContent = viewTitles[view];
  }
  const addBtn = document.getElementById('header-add-btn');
  addBtn.style.display = ['lists', 'categories', 'stores', 'templates'].includes(view) ? 'flex' : 'none';
  closeSidebar();
  lucide.createIcons();
}

document.querySelectorAll('[data-view]').forEach(el => {
  el.addEventListener('click', () => {
    const view = el.dataset.view;
    if (view === 'list-detail') return;
    navigateTo(view);
  });
});

document.getElementById('mobile-menu-btn').addEventListener('click', () => {
  document.getElementById('sidebar').classList.toggle('mobile-open');
  document.getElementById('sidebar-backdrop').classList.toggle('open');
});
document.getElementById('sidebar-backdrop').addEventListener('click', closeSidebar);

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-backdrop').classList.remove('open');
}

// ── Modals ─────────────────────────────────────────────────────────────────
window.openModal = (id) => { document.getElementById(id).classList.add('open'); lucide.createIcons(); };
window.closeModal = (id) => { document.getElementById(id).classList.remove('open'); };

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

document.getElementById('new-list-name').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('create-list-btn').click(); });
document.getElementById('new-category-name').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('save-category-btn').click(); });
document.getElementById('new-store-name').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('save-store-btn').click(); });

// ── Toast ──────────────────────────────────────────────────────────────────
window.showToast = (msg, type = 'info') => {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = 'toast ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '');
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
  toast.innerHTML = `<i data-lucide="${icon}"></i> ${msg}`;
  container.appendChild(toast);
  lucide.createIcons();
  setTimeout(() => {
    toast.style.animation = 'toast-out .2s ease forwards';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
};

// ── Build meta ─────────────────────────────────────────────────────────────
async function loadBuildMeta() {
  const el = document.getElementById('build-meta');
  const repoUrl = 'https://github.com/dennismzanetti/shopping-list-app';
  try {
    const res = await fetch('./version.json', { cache: 'no-store' });
    if (!res.ok) throw new Error();
    const v = await res.json();
    const shortSha = (v.sha || '').slice(0, 7);
    const buildLabel = v.buildNumber ? `#${v.buildNumber}` : '';
    const shaLink = shortSha ? ` &middot; <a href="${v.commitUrl}" target="_blank" rel="noopener noreferrer">${shortSha}</a>` : '';
    el.innerHTML = `Build ${buildLabel}${shaLink} &middot; <a href="${v.repo || repoUrl}" target="_blank" rel="noopener noreferrer">View source</a>`;
  } catch {
    el.innerHTML = `<a href="${repoUrl}" target="_blank" rel="noopener noreferrer">View source</a>`;
  }
}
loadBuildMeta();

lucide.createIcons();
