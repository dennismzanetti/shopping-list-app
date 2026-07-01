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
  document.querySelectorAll('.header-nav-item, .bottom-nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.add('active');
  document.querySelectorAll(`[data-view="${view}"]`).forEach(n => n.classList.add('active'));
  if (viewTitles[view]) {
    const titleEl = document.getElementById('header-title');
    if (titleEl) titleEl.textContent = viewTitles[view];
  }
  if (view === 'settings' && onSettings) onSettings();
  createIcons();
}

export function initNav({ onSettings } = {}) {
  // Mobile hamburger — only wire up if the sidebar still exists (graceful fallback)
  const mobileMenuBtn = document.getElementById('mobile-menu-btn');
  const sidebar = document.getElementById('sidebar');
  const sidebarBackdrop = document.getElementById('sidebar-backdrop');

  if (mobileMenuBtn && sidebar) {
    mobileMenuBtn.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      if (sidebarBackdrop) sidebarBackdrop.classList.toggle('open');
    });
  }
  if (sidebarBackdrop) {
    sidebarBackdrop.addEventListener('click', () => {
      if (sidebar) sidebar.classList.remove('mobile-open');
      sidebarBackdrop.classList.remove('open');
    });
  }

  document.querySelectorAll('.header-nav-item[data-view], .bottom-nav-item[data-view]').forEach(item =>
    item.addEventListener('click', () => navigateTo(item.dataset.view, { onSettings }))
  );
}
