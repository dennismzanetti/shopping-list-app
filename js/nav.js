// nav.js - view navigation
import { createIcons } from './utils.js';

const VIEWS = ['lists', 'list-detail', 'templates', 'template-editor', 'categories', 'category-detail', 'stores', 'store-detail', 'settings'];

export function navigateTo(viewName, opts = {}) {
  VIEWS.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.classList.toggle('active', v === viewName);
  });
  document.querySelectorAll('[data-view]').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === viewName);
  });
  if (viewName === 'settings' && opts.onSettings) opts.onSettings();
  createIcons();
}

export function initNav(opts = {}) {
  document.querySelectorAll('[data-view]').forEach(tab => {
    tab.addEventListener('click', async () => {
      // If a before-navigate hook is registered, call it first (e.g. auto-save template editor)
      if (opts.onBeforeNavigate) {
        await opts.onBeforeNavigate(tab.dataset.view);
      }
      navigateTo(tab.dataset.view, opts);
    });
  });

  const hamburger = document.getElementById('mobile-menu-btn');
  const sidebar   = document.getElementById('sidebar');
  const backdrop  = document.getElementById('sidebar-backdrop');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => {
      sidebar.classList.toggle('open');
      if (backdrop) backdrop.classList.toggle('open');
    });
  }
  if (backdrop) {
    backdrop.addEventListener('click', () => {
      sidebar.classList.remove('open');
      backdrop.classList.remove('open');
    });
  }
}
