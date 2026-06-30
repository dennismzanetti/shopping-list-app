// js/nav.js
// View navigation, sidebar, user profile UI, and About commit history.

import { escHtml, createIcons } from './utils.js';

const VIEW_TITLES = {
  lists: 'My Lists',
  'list-detail': '',
  templates: 'Templates',
  categories: 'Categories',
  stores: 'Stores',
  settings: 'Settings'
};

export function navigateTo(view, onSettings) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(n => n.classList.remove('active'));
  const target = document.getElementById('view-' + view);
  if (target) target.classList.add('active');
  document.querySelectorAll(`[data-view="${view}"]`).forEach(n => n.classList.add('active'));
  if (VIEW_TITLES[view]) document.getElementById('header-title').textContent = VIEW_TITLES[view];
  if (view === 'settings' && typeof onSettings === 'function') onSettings();
  closeSidebar();
  createIcons();
}

export function closeSidebar() {
  document.getElementById('sidebar').classList.remove('mobile-open');
  document.getElementById('sidebar-backdrop').classList.remove('open');
}

export function updateUserUI(currentUser) {
  const name     = currentUser.displayName || currentUser.email || 'User';
  const email    = currentUser.email || '';
  const initials = name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
  ['sidebar-avatar', 'settings-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = initials;
  });
  const els = {
    'sidebar-name':   name,
    'sidebar-email':  email,
    'settings-name':  name,
    'settings-email': email
  };
  Object.entries(els).forEach(([id, val]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  });
}

// ── Hash-based list restore ──────────────────────────────────────────────────
export function getHashListId() {
  const m = window.location.hash.match(/^#list\/(.+)$/);
  return m ? m[1] : null;
}

export function setHashListId(listId) {
  history.replaceState(null, '', listId ? `#list/${listId}` : '#');
}

// ── About — live commit history ──────────────────────────────────────────────
export async function loadAboutCommits() {
  const tbody = document.getElementById('about-commits-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted);"><span class="spinner" style="margin:0 auto;"></span></td></tr>`;
  const repoUrl = 'https://github.com/dennismzanetti/shopping-list-app';
  try {
    const res = await fetch('https://api.github.com/repos/dennismzanetti/shopping-list-app/commits?per_page=50', {
      headers: { 'Accept': 'application/vnd.github+json' }
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const commits = await res.json();
    const human   = commits.filter(c => {
      const login = (c.author?.login || c.committer?.login || '').toLowerCase();
      return !login.endsWith('[bot]') && login !== 'github-actions' && login !== 'dependabot';
    }).slice(0, 10);
    if (human.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted);">No commits found.</td></tr>`;
      return;
    }
    tbody.innerHTML = human.map(c => {
      const sha      = c.sha;
      const shortSha = sha.slice(0, 7);
      const msg      = escHtml((c.commit.message || '').split('\n')[0]);
      const dateRaw  = c.commit.author?.date || c.commit.committer?.date || '';
      const dateStr  = dateRaw
        ? new Date(dateRaw).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' })
        : '—';
      const commitLink = `${repoUrl}/commit/${sha}`;
      return `<tr>
        <td class="col-date">${dateStr}</td>
        <td class="col-sha"><span class="commit-sha-pill" title="${escHtml(sha)}"><a href="${commitLink}" target="_blank" rel="noopener noreferrer">${shortSha}</a></span></td>
        <td class="col-msg">${msg}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:var(--space-6);color:var(--color-error);">Could not load commits: ${escHtml(e.message)}</td></tr>`;
  }
}
