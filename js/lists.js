import { escHtml, createIcons } from './utils.js';
import { state } from './state.js';
import {
  query, orderBy
} from 'https://www.gstatic.com/firebasejs/11.7.1/firebase-firestore.js';

// ── Lists ──────────────────────────────────────────────────────────────────────────────
export function renderLists(onOpen, onDelete) {
  const grid = document.getElementById('lists-grid');
  const q = document.getElementById('search-lists').value.toLowerCase();
  const filtered = state.allLists.filter(l => l.name.toLowerCase().includes(q));
  document.getElementById('lists-subtitle').textContent = state.allLists.length === 1 ? '1 list' : `${state.allLists.length} lists`;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">
      <div class="empty-state-icon"><i data-lucide="shopping-cart"></i></div>
      <h3>${q ? 'No matching lists' : 'No lists yet'}</h3>
      <p>${q ? 'Try a different search.' : 'Create your first shopping list to get started.'}</p>
      ${!q ? '<button class="btn btn-primary" id="empty-new-list-btn"><i data-lucide="plus"></i> New List</button>' : ''}
    </div>`;
    document.getElementById('empty-new-list-btn')?.addEventListener('click', () => window.openModal('modal-new-list'));
    createIcons(); return;
  }

  grid.innerHTML = filtered.map(list => {
    const total = list.itemCount || 0, checked = list.checkedCount || 0;
    const pct = total > 0 ? Math.round((checked / total) * 100) : 0;
    const storeName = list.storeName ? `<span>${list.storeName}</span>` : '';
    return `<div class="list-card" data-id="${list.id}">
      <div class="list-card-actions"><button class="icon-btn" data-delete-list="${list.id}" aria-label="Delete list" style="color:var(--color-error)"><i data-lucide="trash-2"></i></button></div>
      <div class="list-card-header"><div><div class="list-card-title">${escHtml(list.name)}</div><div class="list-card-meta">${storeName}<span>${total} item${total !== 1 ? 's' : ''}</span><span>${checked} checked</span></div></div></div>
      <div class="list-card-progress"><div class="list-card-progress-bar" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');

  grid.querySelectorAll('.list-card').forEach(card =>
    card.addEventListener('click', e => { if (e.target.closest('[data-delete-list]')) return; onOpen(card.dataset.id); })
  );
  grid.querySelectorAll('[data-delete-list]').forEach(btn =>
    btn.addEventListener('click', e => { e.stopPropagation(); onDelete('list', btn.dataset.deleteList); })
  );
  createIcons();
}

// ── List Detail ───────────────────────────────────────────────────────────────────────────
export function openList(listId, { navigateTo, setHashListId, onSnapshot, itemsCol, renderItems, updateListCounts }) {
  state.currentListId = listId;
  setHashListId(listId);
  const list = state.allLists.find(l => l.id === listId);
  if (!list) return;
  document.getElementById('detail-list-name').textContent = list.name;
  document.getElementById('detail-list-store').textContent = list.storeName ? `📍 ${list.storeName}` : '';
  document.getElementById('header-title').textContent = list.name;
  navigateTo('list-detail');
  if (state.unsubItems) { state.unsubItems(); state.unsubItems = null; }
  state.unsubItems = onSnapshot(query(itemsCol(listId), orderBy('createdAt')), snap => {
    state.allItems = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    renderItems();
    updateListCounts(listId);
  });
}

// ── Update List Counts ────────────────────────────────────────────────────────────────
export async function updateListCounts(listId, { listsCol, updateDoc, doc }) {
  try {
    await updateDoc(doc(listsCol(), listId), {
      itemCount: state.allItems.length,
      checkedCount: state.allItems.filter(i => i.checked).length
    });
  } catch {}
}
