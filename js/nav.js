import { createIcons } from './utils.js';

const viewTitles = {
  lists: 'My Lists',
  'list-detail': '',
  templates: 'Templates',
  categories: 'Categories',
  stores: 'Stores',
  settings: 'Settings'
};

export function navigateTo(view, { onSettings } = {}) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.add('active');
  document.querySelectorAll(`[data-view="${view}"]`).forEach(n => n.classList.add('active'));
  if (viewTitles[view]) document.getElementById('header-title').textContent = viewTitles[view];
  if (view === 'settings' && onSettings) onSettings();
  closeSidebar();
  createIcons();
}

export function closeSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-backdrop').classList.remove('open');
}

export function initNav({ onSettings } = {}) {
  document.getElementById('mobile-menu-btn').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('mobile-open');
    document.getElementById('sidebar-backdrop').classList.toggle('open');
  });
  document.getElementById('sidebar-backdrop').addEventListener('click', closeSidebar);

  document.querySelectorAll('.nav-item[data-view], .bottom-nav-item[data-view]').forEach(item =>
    item.addEventListener('click', () => navigateTo(item.dataset.view, { onSettings }))
  );
}
