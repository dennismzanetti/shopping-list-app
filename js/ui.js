// js/ui.js
// Modal helpers, toast notifications, and build meta loader.

import { createIcons } from './utils.js';

// ── Modals ────────────────────────────────────────────────────────────────────
export function openModal(id) {
  const el = document.getElementById(id);
  if (el) { el.classList.add('open'); createIcons(); }
}

export function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

// Expose globally so inline HTML onclick handlers still work
window.openModal  = openModal;
window.closeModal = closeModal;

// ── Toast ─────────────────────────────────────────────────────────────────────
export function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast     = document.createElement('div');
  toast.className = 'toast ' + (type === 'success' ? 'success' : type === 'error' ? 'error' : '');
  const icon = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';
  toast.innerHTML = `<i data-lucide="${icon}"></i> ${msg}`;
  container.appendChild(toast);
  createIcons();
  setTimeout(() => {
    toast.style.animation = 'toast-out .2s ease forwards';
    setTimeout(() => toast.remove(), 200);
  }, 3000);
}

window.showToast = showToast;

// ── Build meta ────────────────────────────────────────────────────────────────
export async function loadBuildMeta() {
  const el = document.getElementById('build-meta');
  if (!el) return;
  const repoUrl = 'https://github.com/dennismzanetti/shopping-list-app';
  try {
    const res = await fetch('./version.json', { cache: 'no-store' });
    if (!res.ok) throw new Error();
    const v        = await res.json();
    const shortSha = (v.sha || '').slice(0, 7);
    const url      = v.commitUrl || repoUrl;
    el.innerHTML   = shortSha
      ? `<a href="${url}" target="_blank" rel="noopener noreferrer">${shortSha}</a>`
      : `<a href="${repoUrl}" target="_blank" rel="noopener noreferrer">source</a>`;
  } catch {
    el.innerHTML = `<a href="${repoUrl}" target="_blank" rel="noopener noreferrer">source</a>`;
  }
}
