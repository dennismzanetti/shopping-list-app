// js/state.js — shared application state
// All modules import this object and mutate it directly.
// Never reassign `state` itself — only mutate its properties.

export const state = {
  // Auth
  currentUser: null,

  // Active list
  currentListId: null,

  // Firestore unsubscribe handles
  unsubLists: null,
  unsubItems: null,
  unsubCategories: null,
  unsubStores: null,
  unsubTemplates: null,

  // Data collections
  allLists: [],
  allItems: [],
  allCategories: [],
  allStores: [],
  allTemplates: [],

  // Editing state
  editingTemplateId: null,
  editingItemId: null,
  tplEditorItems: [],
  tplItemEditingIdx: -1,

  // Pending delete
  pendingDelete: null,

  // Pending list restore (hash-based)
  pendingListId: null,

  // Theme
  currentTheme: 'light',

  // First-load flag for list subscription
  listsFirstLoad: true,
};
