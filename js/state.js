// js/state.js - shared application state
export const state = {
  // Never reassign `state` itself - only mutate its properties.
  currentUser:    null,
  currentListId:  null,
  editingItemId:  null,
  allLists:       [],
  allItems:       [],
  allCategories:  [],
  allStores:      [],
  allTemplates:   [],
  listsFirstLoad: true,
  pendingListId:  null,
  unsubLists:     null,
  unsubItems:     null,
  unsubCategories:null,
  unsubStores:    null,
  unsubTemplates: null,
};
