// js/seed.js
// Populates Firestore with default categories, stores, and templates
// on first sign-in. Each exported function is a no-op if data already exists.
//
// Usage in shopping-list.js:
//   import { seedDefaultsIfNeeded, seedTemplatesIfNeeded, SEED_TEMPLATES } from './js/seed.js';
//   seedDefaultsIfNeeded(currentUser);
//   seedTemplatesIfNeeded(currentUser);

import { db } from './firebase.js';
import {
  collection, doc, getDocs, writeBatch, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';

// Accept user as a parameter - no global state needed
const uid           = (user) => user.uid;
const categoriesCol = (user) => collection(db, 'users', uid(user), 'categories');
const storesCol     = (user) => collection(db, 'users', uid(user), 'stores');
const templatesCol  = (user) => collection(db, 'users', uid(user), 'templates');

// -- Default categories -------------------------------------------------------
const DEFAULT_CATEGORIES = [
  { name:'Produce',            emoji:'🥦' },
  { name:'Dairy',              emoji:'🧀' },
  { name:'Meat & Seafood',     emoji:'🥩' },
  { name:'Bakery',             emoji:'🍞' },
  { name:'Frozen',             emoji:'🧊' },
  { name:'Beverages',          emoji:'🥤' },
  { name:'Snacks',             emoji:'🍿' },
  { name:'Household',          emoji:'🧹' },
  { name:'Personal Care',      emoji:'🧴' },
  { name:'Pantry & Dry Goods', emoji:'🫙' },
  { name:'Canned Goods',       emoji:'🥫' },
  { name:'Condiments & Sauces',emoji:'🧂' },
  { name:'Deli',               emoji:'🥪' },
  { name:'Breakfast & Cereal', emoji:'🥣' },
  { name:'Alcohol & Wine',     emoji:'🍷' },
  { name:'Baby & Kids',        emoji:'👶' },
  { name:'Pet Supplies',       emoji:'🐾' },
  { name:'Health & Pharmacy',  emoji:'💊' },
  { name:'Other',              emoji:'📦' },
];

// -- Default stores -----------------------------------------------------------
const DEFAULT_STORES = [
  'Walmart', 'Target', 'Whole Foods', 'Costco',
  "Trader Joe's", 'Stop & Shop', "Shaw's", 'Market Basket'
];

// -- Default templates --------------------------------------------------------
export const SEED_TEMPLATES = [
  { emoji:'🛒', name:'Weekly Groceries', desc:'Everyday essentials for the week',
    items:[
      {name:'Milk',qty:'1',unit:'gal',category:'Dairy',stores:[],tags:[],notes:''},
      {name:'Eggs',qty:'1',unit:'doz',category:'Dairy',stores:[],tags:[],notes:''},
      {name:'Bread',qty:'1',unit:'loaf',category:'Bakery',stores:[],tags:[],notes:''},
      {name:'Butter',qty:'',unit:'',category:'Dairy',stores:[],tags:[],notes:''},
      {name:'Cheese',qty:'',unit:'',category:'Dairy',stores:[],tags:[],notes:''},
      {name:'Chicken breast',qty:'2',unit:'lbs',category:'Meat & Seafood',stores:[],tags:[],notes:''},
      {name:'Pasta',qty:'1',unit:'box',category:'Pantry & Dry Goods',stores:[],tags:[],notes:''},
      {name:'Rice',qty:'',unit:'',category:'Pantry & Dry Goods',stores:[],tags:[],notes:''},
      {name:'Olive oil',qty:'',unit:'',category:'Condiments & Sauces',stores:[],tags:[],notes:''},
      {name:'Bananas',qty:'',unit:'',category:'Produce',stores:[],tags:[],notes:''},
      {name:'Spinach',qty:'',unit:'',category:'Produce',stores:[],tags:[],notes:''}
    ] },
  { emoji:'🥩', name:'BBQ & Grilling', desc:'Everything you need for a backyard cookout',
    items:[
      {name:'Burgers',qty:'2',unit:'lbs',category:'Meat & Seafood',stores:[],tags:[],notes:''},
      {name:'Hot dogs',qty:'1',unit:'pkg',category:'Meat & Seafood',stores:[],tags:[],notes:''},
      {name:'Chicken wings',qty:'3',unit:'lbs',category:'Meat & Seafood',stores:[],tags:[],notes:''},
      {name:'Buns',qty:'1',unit:'pkg',category:'Bakery',stores:[],tags:[],notes:''},
      {name:'Ketchup',qty:'',unit:'',category:'Condiments & Sauces',stores:[],tags:[],notes:''},
      {name:'Mustard',qty:'',unit:'',category:'Condiments & Sauces',stores:[],tags:[],notes:''},
      {name:'BBQ sauce',qty:'',unit:'',category:'Condiments & Sauces',stores:[],tags:[],notes:''},
      {name:'Corn on the cob',qty:'6',unit:'',category:'Produce',stores:[],tags:[],notes:''}
    ] },
  { emoji:'🎉', name:'Party Supplies', desc:'Stock up for a gathering or celebration',
    items:[
      {name:'Chips & dip',qty:'',unit:'',category:'Snacks',stores:[],tags:['snacks'],notes:''},
      {name:'Soda',qty:'2',unit:'cases',category:'Beverages',stores:[],tags:['beverages'],notes:''},
      {name:'Ice',qty:'2',unit:'bags',category:'Frozen',stores:[],tags:[],notes:''},
      {name:'Plates',qty:'50',unit:'',category:'Household',stores:[],tags:['supplies'],notes:''},
      {name:'Cups',qty:'50',unit:'',category:'Household',stores:[],tags:['supplies'],notes:''},
      {name:'Napkins',qty:'1',unit:'pkg',category:'Household',stores:[],tags:['supplies'],notes:''}
    ] },
  { emoji:'🏠', name:'Household Basics', desc:'Cleaning and home essentials',
    items:[
      {name:'Paper towels',qty:'6',unit:'rolls',category:'Household',stores:[],tags:['cleaning'],notes:''},
      {name:'Toilet paper',qty:'12',unit:'rolls',category:'Household',stores:[],tags:[],notes:''},
      {name:'Dish soap',qty:'1',unit:'bottle',category:'Household',stores:[],tags:['cleaning'],notes:''},
      {name:'Laundry detergent',qty:'',unit:'',category:'Household',stores:[],tags:['cleaning'],notes:''},
      {name:'Trash bags',qty:'1',unit:'box',category:'Household',stores:[],tags:[],notes:''},
      {name:'Sponges',qty:'',unit:'',category:'Household',stores:[],tags:['cleaning'],notes:''}
    ] },
  { emoji:'🥗', name:'Healthy Eating', desc:'Fresh produce and wholesome staples',
    items:[
      {name:'Kale',qty:'1',unit:'bunch',category:'Produce',stores:[],tags:['produce','organic'],notes:''},
      {name:'Spinach',qty:'1',unit:'bag',category:'Produce',stores:[],tags:['produce'],notes:''},
      {name:'Broccoli',qty:'1',unit:'head',category:'Produce',stores:[],tags:['produce'],notes:''},
      {name:'Avocados',qty:'4',unit:'',category:'Produce',stores:[],tags:['produce'],notes:''},
      {name:'Blueberries',qty:'1',unit:'pint',category:'Produce',stores:[],tags:['produce'],notes:''},
      {name:'Greek yogurt',qty:'',unit:'',category:'Dairy',stores:[],tags:['dairy'],notes:''},
      {name:'Quinoa',qty:'1',unit:'bag',category:'Pantry & Dry Goods',stores:[],tags:[],notes:''},
      {name:'Salmon',qty:'1',unit:'lb',category:'Meat & Seafood',stores:[],tags:['seafood'],notes:''},
      {name:'Almonds',qty:'1',unit:'bag',category:'Snacks',stores:[],tags:['snacks'],notes:''}
    ] },
  { emoji:'🍝', name:'Pasta Night', desc:'Ingredients for a classic Italian dinner',
    items:[
      {name:'Spaghetti',qty:'1',unit:'box',category:'Pantry & Dry Goods',stores:[],tags:[],notes:''},
      {name:'Marinara sauce',qty:'1',unit:'jar',category:'Canned Goods',stores:[],tags:[],notes:''},
      {name:'Ground beef',qty:'1',unit:'lb',category:'Meat & Seafood',stores:[],tags:[],notes:''},
      {name:'Parmesan cheese',qty:'',unit:'',category:'Dairy',stores:[],tags:['dairy'],notes:''},
      {name:'Garlic',qty:'1',unit:'head',category:'Produce',stores:[],tags:['produce'],notes:''},
      {name:'Olive oil',qty:'',unit:'',category:'Condiments & Sauces',stores:[],tags:[],notes:''},
      {name:'Fresh basil',qty:'1',unit:'bunch',category:'Produce',stores:[],tags:['produce'],notes:''}
    ] },
  { emoji:'🥞', name:'Breakfast Week', desc:'Morning staples to start every day right',
    items:[
      {name:'Eggs',qty:'2',unit:'doz',category:'Dairy',stores:[],tags:[],notes:''},
      {name:'Bacon',qty:'1',unit:'pkg',category:'Meat & Seafood',stores:[],tags:[],notes:''},
      {name:'Bread',qty:'1',unit:'loaf',category:'Bakery',stores:[],tags:[],notes:''},
      {name:'Butter',qty:'',unit:'',category:'Dairy',stores:[],tags:[],notes:''},
      {name:'Milk',qty:'1',unit:'gal',category:'Dairy',stores:[],tags:['dairy'],notes:''},
      {name:'Orange juice',qty:'1',unit:'jug',category:'Beverages',stores:[],tags:['beverages'],notes:''},
      {name:'Coffee',qty:'1',unit:'bag',category:'Beverages',stores:[],tags:['beverages'],notes:''},
      {name:'Oats',qty:'1',unit:'box',category:'Breakfast & Cereal',stores:[],tags:[],notes:''},
      {name:'Maple syrup',qty:'',unit:'',category:'Condiments & Sauces',stores:[],tags:[],notes:''}
    ] },
  { emoji:'🎒', name:'Back to School', desc:'Lunches and snacks for busy school days',
    items:[
      {name:'Sandwich bread',qty:'1',unit:'loaf',category:'Bakery',stores:[],tags:[],notes:''},
      {name:'Peanut butter',qty:'1',unit:'jar',category:'Pantry & Dry Goods',stores:[],tags:[],notes:''},
      {name:'Jelly',qty:'1',unit:'jar',category:'Condiments & Sauces',stores:[],tags:[],notes:''},
      {name:'Apple',qty:'6',unit:'',category:'Produce',stores:[],tags:['produce'],notes:''},
      {name:'Granola bars',qty:'1',unit:'box',category:'Snacks',stores:[],tags:['snacks'],notes:''},
      {name:'Juice boxes',qty:'1',unit:'box',category:'Beverages',stores:[],tags:['beverages'],notes:''},
      {name:'String cheese',qty:'1',unit:'pkg',category:'Dairy',stores:[],tags:['dairy'],notes:''}
    ] }
];

// -- Seed functions -----------------------------------------------------------

// Seeds default categories and stores.
// For categories: upserts - adds any DEFAULT_CATEGORIES not already present by name.
// For stores: only seeds if the collection is empty.
export async function seedDefaultsIfNeeded(user) {
  const [catSnap, storeSnap] = await Promise.all([
    getDocs(categoriesCol(user)),
    getDocs(storesCol(user))
  ]);

  const batch = writeBatch(db);
  let dirty = false;

  // Upsert categories: add any that don't already exist by name
  const existingCatNames = new Set(catSnap.docs.map(d => d.data().name));
  DEFAULT_CATEGORIES.forEach(cat => {
    if (!existingCatNames.has(cat.name)) {
      batch.set(doc(categoriesCol(user)), { ...cat, createdAt: serverTimestamp() });
      dirty = true;
    }
  });

  // Stores: only seed if empty
  if (storeSnap.empty) {
    DEFAULT_STORES.forEach(name =>
      batch.set(doc(storesCol(user)), { name, createdAt: serverTimestamp() }));
    dirty = true;
  }

  if (dirty) await batch.commit();
}

// Seeds default templates if the templates collection is empty.
export async function seedTemplatesIfNeeded(user) {
  const snap = await getDocs(templatesCol(user));
  if (snap.empty) {
    const batch = writeBatch(db);
    SEED_TEMPLATES.forEach(t =>
      batch.set(doc(templatesCol(user)), { ...t, createdAt: serverTimestamp() }));
    await batch.commit();
  }
}

// ---------------------------------------------------------------------------
// backfillPublicDocs — one-time migration for existing public templates/lists
// Call window.backfillPublicDocs() from the browser console once to mirror
// any pre-existing public templates and lists into the top-level collections.
// ---------------------------------------------------------------------------
export async function backfillPublicDocs({ db, uid, displayName, email,
  collection, getDocs, query, where, addDoc, updateDoc, doc, serverTimestamp }) {
  const ownerName = displayName || email || '';
  let tplCount = 0, listCount = 0;

  try {
    // ── Templates ────────────────────────────────────────────────────────────
    const tplSnap = await getDocs(
      query(collection(db, 'users', uid, 'templates'), where('visibility', '==', 'public'))
    );
    for (const d of tplSnap.docs) {
      const data = { ...d.data(), ownerId: uid, ownerName, _mirrorId: d.id };
      // Try to update existing mirror first, then create
      try {
        await updateDoc(doc(collection(db, 'publicTemplates'), d.id), data);
      } catch (_) {
        await addDoc(collection(db, 'publicTemplates'), data);
      }
      // Also stamp ownerId back onto the source doc if missing
      if (!d.data().ownerId) {
        await updateDoc(doc(collection(db, 'users', uid, 'templates'), d.id),
          { ownerId: uid, ownerName });
      }
      tplCount++;
    }

    // ── Lists ─────────────────────────────────────────────────────────────────
    const listSnap = await getDocs(
      query(collection(db, 'users', uid, 'lists'), where('visibility', '==', 'public'))
    );
    for (const d of listSnap.docs) {
      const data = { ...d.data(), ownerId: uid, ownerName, _mirrorId: d.id };
      try {
        await updateDoc(doc(collection(db, 'publicLists'), d.id), data);
      } catch (_) {
        await addDoc(collection(db, 'publicLists'), data);
      }
      if (!d.data().ownerId) {
        await updateDoc(doc(collection(db, 'users', uid, 'lists'), d.id),
          { ownerId: uid, ownerName });
      }
      listCount++;
    }

    console.log(`[backfill] Done: ${tplCount} template(s), ${listCount} list(s) mirrored.`);
    window.showToast && window.showToast(
      `Backfill complete: ${tplCount} template(s) and ${listCount} list(s) made public`, 'success'
    );
  } catch (e) {
    console.error('[backfill] Error:', e);
    window.showToast && window.showToast('Backfill error: ' + e.message, 'error');
  }
}

// ---------------------------------------------------------------------------
// backfillGlobalCatsStores — one-time migration for categories and stores.
// Copies each user's per-user categories/stores into the new global
// top-level collections, skipping any that already exist by name.
// Call window.backfillGlobalCatsStores() from the browser console once.
// ---------------------------------------------------------------------------
export async function backfillGlobalCatsStores({ db, uid,
  collection, getDocs, addDoc, query, orderBy, serverTimestamp }) {
  let catCount = 0, storeCount = 0;

  try {
    // ── Fetch existing global names to avoid duplicates ──────────────────────
    const [globalCatsSnap, globalStoresSnap] = await Promise.all([
      getDocs(collection(db, 'categories')),
      getDocs(collection(db, 'stores'))
    ]);
    const existingCatNames   = new Set(globalCatsSnap.docs.map(d => (d.data().name || '').toLowerCase()));
    const existingStoreNames = new Set(globalStoresSnap.docs.map(d => (d.data().name || '').toLowerCase()));

    // ── Copy user's categories ────────────────────────────────────────────────
    const userCatsSnap = await getDocs(
      query(collection(db, 'users', uid, 'categories'), orderBy('createdAt'))
    );
    for (const d of userCatsSnap.docs) {
      const data = d.data();
      if (!existingCatNames.has((data.name || '').toLowerCase())) {
        await addDoc(collection(db, 'categories'), {
          name: data.name || '',
          emoji: data.emoji || '',
          createdAt: data.createdAt || serverTimestamp()
        });
        existingCatNames.add((data.name || '').toLowerCase());
        catCount++;
      }
    }

    // ── Copy user's stores ────────────────────────────────────────────────────
    const userStoresSnap = await getDocs(
      query(collection(db, 'users', uid, 'stores'), orderBy('createdAt'))
    );
    for (const d of userStoresSnap.docs) {
      const data = d.data();
      if (!existingStoreNames.has((data.name || '').toLowerCase())) {
        await addDoc(collection(db, 'stores'), {
          name: data.name || '',
          emoji: data.emoji || '',
          createdAt: data.createdAt || serverTimestamp()
        });
        existingStoreNames.add((data.name || '').toLowerCase());
        storeCount++;
      }
    }

    console.log(`[backfill] Done: ${catCount} category/ies, ${storeCount} store(s) migrated to global collections.`);
    window.showToast && window.showToast(
      `Backfill complete: ${catCount} categories and ${storeCount} stores added to global collections`, 'success'
    );
  } catch (e) {
    console.error('[backfill] Error:', e);
    window.showToast && window.showToast('Backfill error: ' + e.message, 'error');
  }
}
