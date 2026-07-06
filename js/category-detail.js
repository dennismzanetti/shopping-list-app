// js/category-detail.js
// Opens a detail view for a category, showing template items and list items tagged to it.

import { state }      from './state.js';
import { navigateTo } from './nav.js';
import { escHtml, createIcons } from './utils.js';

let _getDocs  = null;
let _listsCol = null;
let _itemsCol = null;

/**
 * Called from app.js to pass Firestore helpers.
 */
export function initCategoryDetail({ getDocs, listsCol, itemsCol }) {
  _getDocs  = getDocs;
  _listsCol = listsCol;
  _itemsCol = itemsCol;

  // Back button
  const backBtn = document.getElementById('category-detail-back-btn');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      navigateTo('categories');
      document.querySelectorAll('[data-view]').forEach(n =>
        n.classList.toggle('active', n.dataset.view === 'categories')
      );
    });
  }

  // Expose globally so categories.js can call it
  window.openCategoryDetail = openCategoryDetail;
}

/**
 * Navigate to the category detail view and populate it.
 * @param {string} categoryId
 */
export async function openCategoryDetail(categoryId) {
  const category = state.allCategories.find(c => c.id === categoryId);
  if (!category) return;

  // Update header
  const titleEl = document.getElementById('category-detail-title');
  if (titleEl) titleEl.textContent = (category.emoji ? category.emoji + '\u00a0' : '') + category.name;

  // Show view immediately (with loading state)
  navigateTo('category-detail');
  document.querySelectorAll('[data-view]').forEach(n =>
    n.classList.toggle('active', n.dataset.view === 'categories')
  );

  // ── Template Items ────────────────────────────────────────────────────────
  const tplList  = document.getElementById('category-detail-template-items');
  const tplEmpty = document.getElementById('category-detail-template-empty');
  if (tplList) tplList.innerHTML = '<li class="store-detail-loading"><span class="spinner" style="width:16px;height:16px;"></span> Loading\u2026</li>';

  // ── List Items ────────────────────────────────────────────────────────────
  const listItemsList  = document.getElementById('category-detail-list-items');
  const listItemsEmpty = document.getElementById('category-detail-list-items-empty');
  if (listItemsList) listItemsList.innerHTML = '<li class="store-detail-loading"><span class="spinner" style="width:16px;height:16px;"></span> Loading\u2026</li>';

  // Render template items (in-memory scan)
  const tplItems = [];
  (state.allTemplates || []).forEach(tpl => {
    (tpl.items || []).forEach(item => {
      const itemCategory = item.category || item.categoryId || '';
      const match =
        itemCategory === categoryId ||
        (typeof itemCategory === 'string' &&
          itemCategory.toLowerCase() === category.name.toLowerCase());
      if (match) tplItems.push({ ...item, _tplName: tpl.name, _tplEmoji: tpl.emoji || '\uD83D\uDCCB' });
    });
  });

  if (tplList) {
    if (tplItems.length === 0) {
      tplList.innerHTML = '';
      if (tplEmpty) tplEmpty.style.display = '';
    } else {
      if (tplEmpty) tplEmpty.style.display = 'none';
      tplList.innerHTML = tplItems.map(item => `
        <li class="store-detail-item">
          <span class="store-detail-item-name">${item.emoji ? escHtml(item.emoji) + '\u00a0' : ''}${escHtml(item.name || item.text || '')}</span>
          <span class="store-detail-item-source">${escHtml(item._tplEmoji)}\u00a0${escHtml(item._tplName)}</span>
        </li>`).join('');
    }
  }

  // Fetch list items (one-time getDocs across all lists)
  const listItems = [];
  try {
    if (_getDocs && _listsCol) {
      const listsSnap = await _getDocs(_listsCol());
      const fetches = listsSnap.docs.map(async listDoc => {
        const listData = listDoc.data();
        const itemsSnap = await _getDocs(_itemsCol(listDoc.id));
        itemsSnap.docs.forEach(itemDoc => {
          const item = itemDoc.data();
          const itemCategory = item.category || item.categoryId || '';
          const match =
            itemCategory === categoryId ||
            (typeof itemCategory === 'string' &&
              itemCategory.toLowerCase() === category.name.toLowerCase());
          if (match) {
            listItems.push({
              ...item,
              id: itemDoc.id,
              _listName: listData.name || 'Unnamed List',
              _listEmoji: listData.emoji || '\uD83D\uDED2',
            });
          }
        });
      });
      await Promise.all(fetches);
    }
  } catch (e) {
    console.error('category-detail fetch error:', e);
  }

  if (listItemsList) {
    if (listItems.length === 0) {
      listItemsList.innerHTML = '';
      if (listItemsEmpty) listItemsEmpty.style.display = '';
    } else {
      if (listItemsEmpty) listItemsEmpty.style.display = 'none';
      listItemsList.innerHTML = listItems.map(item => `
        <li class="store-detail-item ${item.checked ? 'store-detail-item--checked' : ''}">
          <span class="store-detail-item-name">${item.emoji ? escHtml(item.emoji) + '\u00a0' : ''}${escHtml(item.name || item.text || '')}</span>
          <span class="store-detail-item-source">${escHtml(item._listEmoji)}\u00a0${escHtml(item._listName)}</span>
        </li>`).join('');
    }
  }

  createIcons();
}
