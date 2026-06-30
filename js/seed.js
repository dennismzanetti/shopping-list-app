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

// Accept user as a parameter — no global state needed
const uid           = (user) => user.uid;
const categoriesCol = (user) => collection(db, 'users', uid(user), 'categories');
const storesCol     = (user) => collection(db, 'users', uid(user), 'stores');
const templatesCol  = (user) => collection(db, 'users', uid(user), 'templates');

// ── Default categories ───────────────────────────────────────────────────────
const DEFAULT_CATEGORIES = [
  { name:'Produce',        emoji:'🥦' },
  { name:'Dairy',          emoji:'🧀' },
  { name:'Meat & Seafood', emoji:'🥩' },
  { name:'Bakery',         emoji:'🍞' },
  { name:'Frozen',         emoji:'🧊' },
  { name:'Beverages',      emoji:'🥤' },
  { name:'Snacks',         emoji:'🍿' },
  { name:'Household',      emoji:'🧹' },
  { name:'Personal Care',  emoji:'🧴' },
  { name:'Other',          emoji:'📦' },
];

// ── Default stores ───────────────────────────────────────────────────────────
const DEFAULT_STORES = [
  'Walmart', 'Target', 'Whole Foods', 'Costco',
  "Trader Joe's", 'Stop & Shop', "Shaw's", 'Market Basket'
];

// ── Default templates ────────────────────────────────────────────────────────
export const SEED_TEMPLATES = [
  { emoji:'🛒', name:'Weekly Groceries', desc:'Everyday essentials for the week',
    items:[
      {name:'Milk',qty:'1',unit:'gal',category:'',stores:[],tags:[],notes:''},
      {name:'Eggs',qty:'1',unit:'doz',category:'',stores:[],tags:[],notes:''},
      {name:'Bread',qty:'1',unit:'loaf',category:'',stores:[],tags:[],notes:''},
      {name:'Butter',qty:'',unit:'',category:'',stores:[],tags:[],notes:''},
      {name:'Cheese',qty:'',unit:'',category:'',stores:[],tags:[],notes:''},
      {name:'Chicken breast',qty:'2',unit:'lbs',category:'',stores:[],tags:[],notes:''},
      {name:'Pasta',qty:'1',unit:'box',category:'',stores:[],tags:[],notes:''},
      {name:'Rice',qty:'',unit:'',category:'',stores:[],tags:[],notes:''},
      {name:'Olive oil',qty:'',unit:'',category:'',stores:[],tags:[],notes:''},
      {name:'Bananas',qty:'',unit:'',category:'',stores:[],tags:[],notes:''},
      {name:'Spinach',qty:'',unit:'',category:'',stores:[],tags:[],notes:''}
    ] },
  { emoji:'🥩', name:'BBQ & Grilling', desc:'Everything you need for a backyard cookout',
    items:[
      {name:'Burgers',qty:'2',unit:'lbs',category:'',stores:[],tags:[],notes:''},
      {name:'Hot dogs',qty:'1',unit:'pkg',category:'',stores:[],tags:[],notes:''},
      {name:'Chicken wings',qty:'3',unit:'lbs',category:'',stores:[],tags:[],notes:''},
      {name:'Buns',qty:'1',unit:'pkg',category:'',stores:[],tags:[],notes:''},
      {name:'Ketchup',qty:'',unit:'',category:'',stores:[],tags:[],notes:''},
      {name:'Mustard',qty:'',unit:'',category:'',stores:[],tags:[],notes:''},
      {name:'BBQ sauce',qty:'',unit:'',category:'',stores:[],tags:[],notes:''},
      {name:'Corn on the cob',qty:'6',unit:'',category:'',stores:[],tags:[],notes:''}
    ] },
  { emoji:'🎉', name:'Party Supplies', desc:'Stock up for a gathering or celebration',
    items:[
      {name:'Chips & dip',qty:'',unit:'',category:'',stores:[],tags:['snacks'],notes:''},
      {name:'Soda',qty:'2',unit:'cases',category:'',stores:[],tags:['beverages'],notes:''},
      {name:'Ice',qty:'2',unit:'bags',category:'',stores:[],tags:[],notes:''},
      {name:'Plates',qty:'50',unit:'',category:'',stores:[],tags:['supplies'],notes:''},
      {name:'Cups',qty:'50',unit:'',category:'',stores:[],tags:['supplies'],notes:''},
      {name:'Napkins',qty:'1',unit:'pkg',category:'',stores:[],tags:['supplies'],notes:''}
    ] },
  { emoji:'🏠', name:'Household Basics', desc:'Cleaning and home essentials',
    items:[
      {name:'Paper towels',qty:'6',unit:'rolls',category:'',stores:[],tags:['cleaning'],notes:''},
      {name:'Toilet paper',qty:'12',unit:'rolls',category:'',stores:[],tags:[],notes:''},
      {name:'Dish soap',qty:'1',unit:'bottle',category:'',stores:[],tags:['cleaning'],notes:''},
      {name:'Laundry detergent',qty:'',unit:'',category:'',stores:[],tags:['cleaning'],notes:''},
      {name:'Trash bags',qty:'1',unit:'box',category:'',stores:[],tags:[],notes:''},
      {name:'Sponges',qty:'',unit:'',category:'',stores:[],tags:['cleaning'],notes:''}
    ] },
  { emoji:'🥗', name:'Healthy Eating', desc:'Fresh produce and wholesome staples',
    items:[
      {name:'Kale',qty:'1',unit:'bunch',category:'',stores:[],tags:['produce','organic'],notes:''},
      {name:'Spinach',qty:'1',unit:'bag',category:'',stores:[],tags:['produce'],notes:''},
      {name:'Broccoli',qty:'1',unit:'head',category:'',stores:[],tags:['produce'],notes:''},
      {name:'Avocados',qty:'4',unit:'',category:'',stores:[],tags:['produce'],notes:''},
      {name:'Blueberries',qty:'1',unit:'pint',category:'',stores:[],tags:['produce'],notes:''},
      {name:'Greek yogurt',qty:'',unit:'',category:'',stores:[],tags:['dairy'],notes:''},
      {name:'Quinoa',qty:'1',unit:'bag',category:'',stores:[],tags:[],notes:''},
      {name:'Salmon',qty:'1',unit:'lb',category:'',stores:[],tags:['seafood'],notes:''},
      {name:'Almonds',qty:'1',unit:'bag',category:'',stores:[],tags:['snacks'],notes:''}
    ] },
  { emoji:'🍝', name:'Pasta Night', desc:'Ingredients for a classic Italian dinner',
    items:[
      {name:'Spaghetti',qty:'1',unit:'box',category:'',stores:[],tags:[],notes:''},
      {name:'Marinara sauce',qty:'1',unit:'jar',category:'',stores:[],tags:[],notes:''},
      {name:'Ground beef',qty:'1',unit:'lb',category:'',stores:[],tags:[],notes:''},
      {name:'Parmesan cheese',qty:'',unit:'',category:'',stores:[],tags:['dairy'],notes:''},
      {name:'Garlic',qty:'1',unit:'head',category:'',stores:[],tags:['produce'],notes:''},
      {name:'Olive oil',qty:'',unit:'',category:'',stores:[],tags:[],notes:''},
      {name:'Fresh basil',qty:'1',unit:'bunch',category:'',stores:[],tags:['produce'],notes:''}
    ] },
  { emoji:'🥞', name:'Breakfast Week', desc:'Morning staples to start every day right',
    items:[
      {name:'Eggs',qty:'2',unit:'doz',category:'',stores:[],tags:[],notes:''},
      {name:'Bacon',qty:'1',unit:'pkg',category:'',stores:[],tags:[],notes:''},
      {name:'Bread',qty:'1',unit:'loaf',category:'',stores:[],tags:[],notes:''},
      {name:'Butter',qty:'',unit:'',category:'',stores:[],tags:[],notes:''},
      {name:'Milk',qty:'1',unit:'gal',category:'',stores:[],tags:['dairy'],notes:''},
      {name:'Orange juice',qty:'1',unit:'jug',category:'',stores:[],tags:['beverages'],notes:''},
      {name:'Coffee',qty:'1',unit:'bag',category:'',stores:[],tags:['beverages'],notes:''},
      {name:'Oats',qty:'1',unit:'box',category:'',stores:[],tags:[],notes:''},
      {name:'Maple syrup',qty:'',unit:'',category:'',stores:[],tags:[],notes:''}
    ] },
  { emoji:'🎒', name:'Back to School', desc:'Lunches and snacks for busy school days',
    items:[
      {name:'Sandwich bread',qty:'1',unit:'loaf',category:'',stores:[],tags:[],notes:''},
      {name:'Peanut butter',qty:'1',unit:'jar',category:'',stores:[],tags:[],notes:''},
      {name:'Jelly',qty:'1',unit:'jar',category:'',stores:[],tags:[],notes:''},
      {name:'Apple',qty:'6',unit:'',category:'',stores:[],tags:['produce'],notes:''},
      {name:'Granola bars',qty:'1',unit:'box',category:'',stores:[],tags:['snacks'],notes:''},
      {name:'Juice boxes',qty:'1',unit:'box',category:'',stores:[],tags:['beverages'],notes:''},
      {name:'String cheese',qty:'1',unit:'pkg',category:'',stores:[],tags:['dairy'],notes:''}
    ] }
];

// ── Seed functions ───────────────────────────────────────────────────────────

// Seeds default categories and stores in a single batch if both are empty.
export async function seedDefaultsIfNeeded(user) {
  const [catSnap, storeSnap] = await Promise.all([
    getDocs(categoriesCol(user)),
    getDocs(storesCol(user))
  ]);
  const batch = writeBatch(db);
  let dirty = false;
  if (catSnap.empty) {
    DEFAULT_CATEGORIES.forEach(cat =>
      batch.set(doc(categoriesCol(user)), { ...cat, createdAt: serverTimestamp() }));
    dirty = true;
  }
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
