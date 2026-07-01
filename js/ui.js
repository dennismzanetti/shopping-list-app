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

// ── Emoji Picker ──────────────────────────────────────────────────────────────
const EMOJI_LIST = [
  // Food & Drink
  '🛒','🧺','🍎','🍊','🍋','🍇','🍓','🫐','🥝','🍑','🥭','🍍','🥥','🍆','🥑','🥦','🥬',
  '🥒','🫛','🌽','🥕','🧅','🧄','🥔','🍠','🫚','🧈','🥚','🍳','🧀','🥩','🍗','🥓','🌭',
  '🍔','🍟','🍕','🥪','🥙','🌮','🌯','🥗','🍜','🍝','🍲','🍛','🍣','🍱','🍤','🍙','🍚',
  '🍞','🥐','🥖','🫓','🥨','🥯','🧁','🍰','🎂','🍮','🍭','🍬','🍫','🍿','🍩','🍪','🌰',
  '🥜','🍯','🧃','🥤','☕','🍵','🧋','🍺','🍷','🥂','🍾','🧊','🍼','🥛','🫖','🧉',
  // Household
  '🏠','🏡','🏪','🏬','🛍️','🎁','🧹','🧺','🧻','🪣','🧼','🪥','🧴','🪒','🛁','🚿',
  '🪤','🧷','🧵','🧶','🪡','🪢','🧸','🪆','🖼️','🪞','🪟','🛋️','🪑','🚪','🪜','🧳',
  // Health & Beauty
  '💊','💉','🩺','🩹','🧬','🔬','🩻','🫀','🫁','🦷','👁️','👃','💪','🦵','🧠',
  '💄','💅','💋','👄','💆','🧖','🛀',
  // Baby & Kids
  '👶','🍼','🧸','🪀','🎠','🎡','🎢','🎪','🎭','🎨','🖌️','🎯','🎳','🎮','🕹️',
  // Pets
  '🐶','🐱','🐰','🐹','🦜','🐠','🐟','🐾','🦴','🐾',
  // Vehicles & Transport
  '🚗','🚕','🚌','🚎','🏎️','🚓','🚑','🚒','🛻','🚚','🚛','✈️','🚀','⛵','🚢',
  // Nature
  '🌸','🌺','🌻','🌹','🌷','💐','🍀','🌿','🌱','🌲','🌳','🍁','🍂','🍃','☀️','🌙','⭐','🌈','❄️','⛄',
  // Activities & Sports
  '⚽','🏀','🏈','⚾','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🥋','🎽','🛹','🛼','🏋️','🤸',
  // Misc
  '❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💯','✅','⭐','🔥','💫','✨','🎉','🎊',
  '🏅','🥇','🏆','🎀','🎗️','📦','📋','📝','🖊️','📌','📍','🗂️','📁','📂','🗒️','💼',
];

let _emojiTargetInput = null;
let _emojiTargetBtn   = null;
let _emojiInitialized = false;

function _initEmojiPickerDOM() {
  if (_emojiInitialized) return;
  _emojiInitialized = true;

  const overlay   = document.getElementById('emoji-picker-overlay');
  const grid      = document.getElementById('emoji-grid');
  const searchEl  = document.getElementById('emoji-search');
  const closeBtn  = document.getElementById('emoji-picker-close');

  function renderGrid(filter = '') {
    const filtered = filter
      ? EMOJI_LIST.filter(e => e.includes(filter))
      : EMOJI_LIST;
    grid.innerHTML = filtered.map(e =>
      `<button type="button" class="emoji-option" data-emoji="${e}" aria-label="${e}">${e}</button>`
    ).join('');
    grid.querySelectorAll('.emoji-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const em = btn.dataset.emoji;
        if (_emojiTargetInput) {
          const inp = document.getElementById(_emojiTargetInput);
          if (inp) inp.value = em;
        }
        if (_emojiTargetBtn) {
          const b = document.getElementById(_emojiTargetBtn);
          if (b) {
            // If it's the plain text button (e.g. template emoji btn), set textContent
            // otherwise update the btn text leaving the icon child intact
            const icon = b.querySelector('i, svg');
            if (icon) {
              b.childNodes.forEach(n => { if (n.nodeType === Node.TEXT_NODE) n.remove(); });
              b.insertBefore(document.createTextNode(' ' + em), b.firstChild);
            } else {
              b.textContent = em;
            }
          }
        }
        _closeEmojiPicker();
      });
    });
  }

  renderGrid();

  if (searchEl) {
    searchEl.addEventListener('input', () => renderGrid(searchEl.value.trim()));
  }

  if (closeBtn) closeBtn.addEventListener('click', _closeEmojiPicker);

  // Close on overlay backdrop click
  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) _closeEmojiPicker();
    });
  }

  // Close on Escape
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') _closeEmojiPicker();
  });
}

function _closeEmojiPicker() {
  const overlay  = document.getElementById('emoji-picker-overlay');
  const searchEl = document.getElementById('emoji-search');
  if (overlay)  overlay.classList.remove('open');
  if (searchEl) searchEl.value = '';
  // Re-render grid to reset search
  const grid = document.getElementById('emoji-grid');
  if (grid) {
    grid.innerHTML = EMOJI_LIST.map(e =>
      `<button type="button" class="emoji-option" data-emoji="${e}" aria-label="${e}">${e}</button>`
    ).join('');
    grid.querySelectorAll('.emoji-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const em = btn.dataset.emoji;
        if (_emojiTargetInput) {
          const inp = document.getElementById(_emojiTargetInput);
          if (inp) inp.value = em;
        }
        if (_emojiTargetBtn) {
          const b = document.getElementById(_emojiTargetBtn);
          if (b) {
            const icon = b.querySelector('i, svg');
            if (icon) {
              b.childNodes.forEach(n => { if (n.nodeType === Node.TEXT_NODE) n.remove(); });
              b.insertBefore(document.createTextNode(' ' + em), b.firstChild);
            } else {
              b.textContent = em;
            }
          }
        }
        _closeEmojiPicker();
      });
    });
  }
  _emojiTargetInput = null;
  _emojiTargetBtn   = null;
}

/**
 * Open the shared emoji picker overlay.
 * @param {string} targetInputId  – id of the <input> to receive the emoji value
 * @param {string|null} targetBtnId – id of the trigger <button> to update its label (optional)
 */
export function openEmojiPicker(targetInputId, targetBtnId = null) {
  _initEmojiPickerDOM();
  _emojiTargetInput = targetInputId;
  _emojiTargetBtn   = targetBtnId;
  const overlay  = document.getElementById('emoji-picker-overlay');
  const searchEl = document.getElementById('emoji-search');
  if (searchEl) searchEl.value = '';
  if (overlay)  overlay.classList.add('open');
  setTimeout(() => searchEl?.focus(), 50);
}
