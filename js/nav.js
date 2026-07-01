// nav.js - view navigation
import { createIcons } from './utils.js';
import { loadAboutCommits } from './about.js';

const VIEWS = ['lists','list-detail','settings','templates','categories-stores'];

export function navigateTo(viewName, opts = {}) {
  VIEWS.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.style.display = (v === viewName) ? '' : 'none';
  });
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.view === viewName);
  });
  if (viewName === 'settings' && opts.onSettings) opts.onSettings();
  createIcons();
}

export function initNav(opts = {}) {
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => navigateTo(tab.dataset.view, opts));
  });

  // Mobile hamburger - only wire up if the sidebar still exists (graceful fallback)
  const hamburger = document.getElementById('hamburger-btn');
  const sidebar   = document.getElementById('sidebar');
  if (hamburger && sidebar) {
    hamburger.addEventListener('click', () => sidebar.classList.toggle('open'));
  }
}
