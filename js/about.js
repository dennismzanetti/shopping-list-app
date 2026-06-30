import { escHtml } from './utils.js';

const REPO_URL = 'https://github.com/dennismzanetti/shopping-list-app';

export async function loadAboutCommits() {
  const tbody = document.getElementById('about-commits-tbody');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted);"><span class="spinner" style="margin:0 auto;"></span></td></tr>`;
  try {
    const res = await fetch('https://api.github.com/repos/dennismzanetti/shopping-list-app/commits?per_page=50', {
      headers: { 'Accept': 'application/vnd.github+json' }
    });
    if (!res.ok) throw new Error(`GitHub API ${res.status}`);
    const commits = await res.json();
    const human = commits.filter(c => {
      const login = (c.author?.login || c.committer?.login || '').toLowerCase();
      return !login.endsWith('[bot]') && login !== 'github-actions' && login !== 'dependabot';
    }).slice(0, 10);
    if (human.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:var(--space-6);color:var(--color-text-muted);">No commits found.</td></tr>`;
      return;
    }
    tbody.innerHTML = human.map(c => {
      const sha     = c.sha;
      const msg     = escHtml((c.commit.message || '').split('\n')[0]);
      const dateRaw = c.commit.author?.date || c.commit.committer?.date || '';
      const dateStr = dateRaw
        ? new Date(dateRaw).toLocaleString('en-US', { month:'short', day:'numeric', year:'numeric', hour:'numeric', minute:'2-digit' })
        : '\u2014';
      return `<tr>
        <td class="col-date">${dateStr}</td>
        <td class="col-sha"><span class="commit-sha-pill"><a href="${REPO_URL}/commit/${sha}" target="_blank" rel="noopener noreferrer">${escHtml(sha)}</a></span></td>
        <td class="col-msg">${msg}</td>
      </tr>`;
    }).join('');
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;padding:var(--space-6);color:var(--color-error);">Could not load commits: ${escHtml(e.message)}</td></tr>`;
  }
}

export async function loadBuildMeta() {
  const el = document.getElementById('build-meta');
  if (!el) return;
  try {
    const res = await fetch('./version.json', { cache: 'no-store' });
    if (!res.ok) throw new Error();
    const v = await res.json();
    const fullSha = v.sha || '';
    const url     = v.commitUrl || REPO_URL;
    el.innerHTML  = fullSha
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${escHtml(fullSha)}</a>`
      : `<a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">source</a>`;
  } catch {
    el.innerHTML = `<a href="${REPO_URL}" target="_blank" rel="noopener noreferrer">source</a>`;
  }
}
