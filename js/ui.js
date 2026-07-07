// js/ui.js
// Modal helpers, toast notifications, build meta loader, and shared DOM/UI utilities.

import { createIcons } from './utils.js';
import { state }       from './state.js';

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
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }
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

// ── Category <select> helper (shared by items + templates) ───────────────────
export function buildCategoryOptions(selected = '') {
  const blank = `<option value="">No category</option>`;
  return blank + state.allCategories.map(c =>
    `<option value="${c.name}" ${c.name === selected ? 'selected' : ''}>${(c.emoji ? c.emoji + ' ' : '') + c.name}</option>`
  ).join('');
}

// ── Hash-based list routing (#list-<id>) ──────────────────────────────────────
export function setHashListId(id) {
  history.replaceState(null, '', id ? `#list-${id}` : window.location.pathname);
}

export function getHashListId() {
  const m = window.location.hash.match(/^#list-(.+)$/);
  return m ? m[1] : null;
}

// ── Auth / user DOM helper ────────────────────────────────────────────────────
export function setUserUI(user) {
  const initial = (user.displayName || user.email || 'U')[0].toUpperCase();
  ['header-avatar', 'settings-avatar'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      if (user.photoURL) {
        el.innerHTML = `<img src="${user.photoURL}" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
      } else {
        el.textContent = initial;
      }
    }
  });
  const nameEl  = document.getElementById('settings-name');
  const emailEl = document.getElementById('settings-email');
  if (nameEl)  nameEl.textContent  = user.displayName || '\u2014';
  if (emailEl) emailEl.textContent = user.email || '\u2014';
}

// ── Store Pills (checkbox list for list/template modals) ─────────────────────
export function populateStorePills(containerId, stores = []) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = stores.map(s =>
    `<label class="store-checkbox-label">
      <input type="checkbox" value="${s.name}">
      ${s.emoji ? s.emoji + ' ' : ''}${s.name}
    </label>`
  ).join('');
}

// ── Emoji Picker ──────────────────────────────────────────────────────────────
// Each entry: { e: emoji character, k: space-separated search keywords }
const EMOJI_LIST = [
  // Shopping & Kitchen
  { e:'🛒', k:'cart shopping grocery store' },
  { e:'🧺', k:'basket laundry shopping' },
  { e:'🍽️', k:'plate dinner meal food' },
  { e:'🥄', k:'spoon utensil kitchen' },
  { e:'🍴', k:'fork knife utensil cutlery' },
  { e:'🫙', k:'jar container preserve' },
  // Fruit
  { e:'🍎', k:'apple fruit red' },
  { e:'🍊', k:'orange citrus fruit' },
  { e:'🍋', k:'lemon citrus fruit yellow' },
  { e:'🍇', k:'grapes fruit purple' },
  { e:'🍓', k:'strawberry fruit red berry' },
  { e:'🫐', k:'blueberry fruit berry' },
  { e:'🥝', k:'kiwi fruit green' },
  { e:'🍑', k:'peach fruit' },
  { e:'🥭', k:'mango fruit tropical' },
  { e:'🍍', k:'pineapple fruit tropical' },
  { e:'🥥', k:'coconut tropical fruit' },
  { e:'🍌', k:'banana fruit yellow' },
  { e:'🍉', k:'watermelon fruit summer' },
  { e:'🍈', k:'melon fruit green' },
  { e:'🍒', k:'cherries fruit red' },
  { e:'🍐', k:'pear fruit green' },
  { e:'🫒', k:'olive fruit' },
  // Vegetables
  { e:'🍆', k:'eggplant vegetable purple aubergine' },
  { e:'🥑', k:'avocado vegetable green' },
  { e:'🥦', k:'broccoli vegetable green' },
  { e:'🥬', k:'leafy greens vegetable lettuce' },
  { e:'🥒', k:'cucumber vegetable green' },
  { e:'🫛', k:'pea pod vegetable green' },
  { e:'🌽', k:'corn vegetable yellow maize' },
  { e:'🥕', k:'carrot vegetable orange' },
  { e:'🧅', k:'onion vegetable' },
  { e:'🧄', k:'garlic vegetable' },
  { e:'🥔', k:'potato vegetable' },
  { e:'🍠', k:'sweet potato vegetable' },
  { e:'🍅', k:'tomato vegetable red' },
  { e:'🥜', k:'peanut nuts legume' },
  { e:'🌰', k:'chestnut nut' },
  // Dairy & Eggs
  { e:'🥚', k:'egg dairy breakfast' },
  { e:'🍳', k:'fried egg cooking breakfast pan' },
  { e:'🧀', k:'cheese dairy' },
  { e:'🧈', k:'butter dairy fat' },
  { e:'🥛', k:'milk dairy drink white' },
  // Meat & Protein
  { e:'🥩', k:'meat steak beef protein' },
  { e:'🍗', k:'chicken poultry meat' },
  { e:'🥓', k:'bacon pork meat' },
  { e:'🌭', k:'hot dog sausage meat' },
  { e:'🍖', k:'meat bone leg drumstick' },
  { e:'🦐', k:'shrimp seafood' },
  { e:'🦞', k:'lobster seafood' },
  { e:'🦀', k:'crab seafood' },
  { e:'🐟', k:'fish seafood' },
  { e:'🐠', k:'fish tropical seafood' },
  // Bread & Bakery
  { e:'🍞', k:'bread bakery loaf' },
  { e:'🥐', k:'croissant bakery pastry' },
  { e:'🥖', k:'baguette bread bakery french' },
  { e:'🫓', k:'flatbread bakery bread' },
  { e:'🥨', k:'pretzel bakery snack' },
  { e:'🥯', k:'bagel bread bakery' },
  // Snacks & Sweets
  { e:'🧁', k:'cupcake bakery dessert sweet' },
  { e:'🍰', k:'cake dessert sweet slice' },
  { e:'🎂', k:'birthday cake dessert' },
  { e:'🍮', k:'custard pudding dessert' },
  { e:'🍭', k:'lollipop candy sweet' },
  { e:'🍬', k:'candy sweet' },
  { e:'🍫', k:'chocolate candy sweet bar' },
  { e:'🍿', k:'popcorn snack movie' },
  { e:'🍩', k:'donut doughnut dessert sweet' },
  { e:'🍪', k:'cookie biscuit sweet snack' },
  { e:'🍯', k:'honey jar sweet' },
  { e:'🫚', k:'oil cooking olive' },
  // Prepared Food
  { e:'🍔', k:'burger hamburger fast food' },
  { e:'🍟', k:'fries chips fast food' },
  { e:'🍕', k:'pizza fast food italian' },
  { e:'🥪', k:'sandwich lunch' },
  { e:'🥙', k:'wrap pita sandwich' },
  { e:'🌮', k:'taco mexican food' },
  { e:'🌯', k:'burrito wrap mexican' },
  { e:'🥗', k:'salad green healthy' },
  { e:'🍜', k:'noodles ramen soup asian' },
  { e:'🍝', k:'pasta spaghetti italian' },
  { e:'🍲', k:'stew soup pot' },
  { e:'🍛', k:'curry rice asian' },
  { e:'🍣', k:'sushi japanese asian' },
  { e:'🍱', k:'bento box lunch asian' },
  { e:'🍤', k:'shrimp fried tempura' },
  { e:'🍙', k:'rice ball japanese' },
  { e:'🍚', k:'rice cooked asian' },
  // Drinks
  { e:'🧃', k:'juice drink box carton' },
  { e:'🥤', k:'soda drink cup straw' },
  { e:'☕', k:'coffee hot drink cafe' },
  { e:'🍵', k:'tea hot drink green' },
  { e:'🧋', k:'bubble tea boba drink' },
  { e:'🍺', k:'beer drink alcohol' },
  { e:'🍷', k:'wine drink alcohol red' },
  { e:'🥂', k:'champagne toast drink' },
  { e:'🍾', k:'champagne bottle celebrate' },
  { e:'🧊', k:'ice cube frozen cold' },
  { e:'🍼', k:'baby bottle milk' },
  { e:'🫖', k:'teapot tea hot drink' },
  { e:'🧉', k:'mate tea drink' },
  // Household & Cleaning
  { e:'🏠', k:'house home building' },
  { e:'🏡', k:'house home garden' },
  { e:'🏪', k:'store shop convenience' },
  { e:'🏬', k:'department store shopping mall' },
  { e:'🛍️', k:'shopping bag store' },
  { e:'🎁', k:'gift present wrap' },
  { e:'🧹', k:'broom sweep clean' },
  { e:'🧻', k:'toilet paper roll tissue' },
  { e:'🪣', k:'bucket cleaning' },
  { e:'🧼', k:'soap clean wash' },
  { e:'🪥', k:'toothbrush dental clean' },
  { e:'🧴', k:'lotion bottle soap shampoo' },
  { e:'🪒', k:'razor shave' },
  { e:'🛁', k:'bathtub bath' },
  { e:'🚿', k:'shower clean' },
  { e:'🧷', k:'safety pin sewing' },
  { e:'🧵', k:'thread sewing needle' },
  { e:'🧶', k:'yarn knitting wool' },
  { e:'🧸', k:'teddy bear toy stuffed' },
  { e:'🪆', k:'matryoshka doll toy' },
  { e:'🖼️', k:'picture frame art decor' },
  { e:'🪞', k:'mirror decor' },
  { e:'🪟', k:'window home decor' },
  { e:'🛋️', k:'couch sofa furniture living room' },
  { e:'🪑', k:'chair furniture' },
  { e:'🚪', k:'door home' },
  { e:'🪜', k:'ladder home diy' },
  { e:'🧳', k:'suitcase luggage travel bag' },
  // Health & Beauty
  { e:'💊', k:'pill medicine tablet health' },
  { e:'💉', k:'syringe injection medicine' },
  { e:'🩺', k:'stethoscope doctor health' },
  { e:'🩹', k:'bandage adhesive first aid health' },
  { e:'🔬', k:'microscope science lab' },
  { e:'🦷', k:'tooth dental health' },
  { e:'💄', k:'lipstick makeup beauty' },
  { e:'💅', k:'nail polish beauty manicure' },
  { e:'🧖', k:'spa facial beauty treatment' },
  // Baby & Kids
  { e:'👶', k:'baby infant child' },
  { e:'🪀', k:'yo-yo toy kids' },
  { e:'🎮', k:'video game controller gaming' },
  { e:'🕹️', k:'joystick game arcade' },
  { e:'🎨', k:'art paint palette creative' },
  { e:'🖌️', k:'paintbrush art creative' },
  { e:'🎯', k:'target dart bullseye' },
  { e:'🎳', k:'bowling ball sport' },
  // Pets
  { e:'🐶', k:'dog pet puppy' },
  { e:'🐱', k:'cat pet kitten' },
  { e:'🐰', k:'rabbit bunny pet' },
  { e:'🐹', k:'hamster pet rodent' },
  { e:'🦜', k:'parrot bird pet' },
  { e:'🦴', k:'bone dog pet treat' },
  { e:'🐾', k:'paw print pet animal' },
  // Nature
  { e:'🌸', k:'cherry blossom flower spring pink' },
  { e:'🌺', k:'hibiscus flower tropical' },
  { e:'🌻', k:'sunflower flower yellow' },
  { e:'🌹', k:'rose flower red' },
  { e:'🌷', k:'tulip flower' },
  { e:'💐', k:'bouquet flowers' },
  { e:'🍀', k:'four leaf clover luck green' },
  { e:'🌿', k:'herb leaf green nature' },
  { e:'🌱', k:'seedling plant green grow' },
  { e:'🌲', k:'evergreen tree forest' },
  { e:'🌳', k:'tree nature deciduous' },
  { e:'🍁', k:'maple leaf autumn fall' },
  { e:'🍂', k:'fallen leaf autumn fall' },
  { e:'🍃', k:'leaf nature green' },
  { e:'☀️', k:'sun sunny weather warm' },
  { e:'🌙', k:'moon night crescent' },
  { e:'⭐', k:'star yellow bright' },
  { e:'🌈', k:'rainbow colorful weather' },
  { e:'❄️', k:'snowflake cold winter ice' },
  { e:'⛄', k:'snowman winter cold' },
  // Sports & Activities
  { e:'⚽', k:'soccer football sport ball' },
  { e:'🏀', k:'basketball sport ball' },
  { e:'🏈', k:'football american sport' },
  { e:'⚾', k:'baseball sport ball' },
  { e:'🎾', k:'tennis sport ball' },
  { e:'🏐', k:'volleyball sport ball' },
  { e:'🎱', k:'billiards pool eight ball' },
  { e:'🥊', k:'boxing glove sport fight' },
  { e:'🎽', k:'running shirt sport athletic' },
  { e:'🏋️', k:'weightlifting gym exercise' },
  // Misc / Labels
  { e:'❤️', k:'heart love red' },
  { e:'🧡', k:'heart orange love' },
  { e:'💛', k:'heart yellow love' },
  { e:'💚', k:'heart green love' },
  { e:'💙', k:'heart blue love' },
  { e:'💜', k:'heart purple love' },
  { e:'💯', k:'hundred percent score perfect' },
  { e:'✅', k:'check mark done complete green' },
  { e:'🔥', k:'fire hot flame' },
  { e:'💫', k:'sparkle dizzy star' },
  { e:'✨', k:'sparkles glitter star magic' },
  { e:'🎉', k:'party celebrate confetti' },
  { e:'🎊', k:'confetti celebrate party' },
  { e:'🏆', k:'trophy win award champion' },
  { e:'🥇', k:'gold medal first prize' },
  { e:'🎀', k:'ribbon bow gift' },
  { e:'📦', k:'box package delivery' },
  { e:'📋', k:'clipboard list notes' },
  { e:'📝', k:'memo note write' },
  { e:'📌', k:'pushpin location mark' },
  { e:'🗂️', k:'folder organizer files' },
  { e:'💼', k:'briefcase work business' },
];

let _emojiTargetInput = null;
let _emojiTargetBtn   = null;
let _emojiOnPick      = null;
let _emojiInitialized = false;

function _buildGridHTML(filter = '') {
  const q = filter.toLowerCase();
  const filtered = q
    ? EMOJI_LIST.filter(({ e, k }) => k.includes(q) || e === q)
    : EMOJI_LIST;
  return filtered.length
    ? filtered.map(({ e }) =>
        `<button type="button" class="emoji-option" data-emoji="${e}" aria-label="${e}">${e}</button>`
      ).join('')
    : '<p style="grid-column:1/-1;text-align:center;color:var(--color-text-muted);padding:var(--space-4)">No results</p>';
}

function _attachGridClicks(grid) {
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
      if (typeof _emojiOnPick === 'function') _emojiOnPick(em);
      _closeEmojiPicker();
    });
  });
}

function _initEmojiPickerDOM() {
  if (_emojiInitialized) return;
  _emojiInitialized = true;

  const overlay  = document.getElementById('emoji-picker-overlay');
  const grid     = document.getElementById('emoji-grid');
  const searchEl = document.getElementById('emoji-search');
  const closeBtn = document.getElementById('emoji-picker-close');

  grid.innerHTML = _buildGridHTML();
  _attachGridClicks(grid);

  if (searchEl) {
    searchEl.addEventListener('input', () => {
      grid.innerHTML = _buildGridHTML(searchEl.value.trim());
      _attachGridClicks(grid);
    });
  }

  if (closeBtn) closeBtn.addEventListener('click', _closeEmojiPicker);

  if (overlay) {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) _closeEmojiPicker();
    });
  }

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') _closeEmojiPicker();
  });
}

function _closeEmojiPicker() {
  const overlay  = document.getElementById('emoji-picker-overlay');
  const searchEl = document.getElementById('emoji-search');
  const grid     = document.getElementById('emoji-grid');
  if (overlay)  overlay.classList.remove('open');
  if (searchEl) searchEl.value = '';
  if (grid) {
    grid.innerHTML = _buildGridHTML();
    _attachGridClicks(grid);
  }
  _emojiTargetInput = null;
  _emojiTargetBtn   = null;
  _emojiOnPick      = null;
}

/**
 * Open the shared emoji picker overlay.
 * @param {string}        targetInputId – id of the <input type="hidden"> to receive the emoji value
 * @param {string|null}   targetBtnId   – id of the trigger <button> to update its label (optional)
 * @param {Function|null} onPick        – optional callback fired with the chosen emoji (optional)
 */
export function openEmojiPicker(targetInputId, targetBtnId = null, onPick = null) {
  _initEmojiPickerDOM();
  _emojiTargetInput = targetInputId;
  _emojiTargetBtn   = targetBtnId;
  _emojiOnPick      = typeof onPick === 'function' ? onPick : null;
  const overlay  = document.getElementById('emoji-picker-overlay');
  const searchEl = document.getElementById('emoji-search');
  if (searchEl) searchEl.value = '';
  if (overlay)  overlay.classList.add('open');
  setTimeout(() => searchEl?.focus(), 50);
}

// ── Collapsible card sections ─────────────────────────────────────────────────
document.addEventListener('click', function(e) {
  const btn = e.target.closest('[data-collapse-btn]');
  const header = e.target.closest('[data-collapse-target]');
  const targetId = (btn && btn.dataset.collapseBtn) || (header && header.dataset.collapseTarget);
  if (!targetId) return;
  if (!btn && header) {
    const clickedInteractive = e.target.closest('button, a, input, select');
    if (clickedInteractive) return;
  }
  const body = document.getElementById(targetId);
  const toggleBtn = document.querySelector('[data-collapse-btn="' + targetId + '"]');
  if (!body || !toggleBtn) return;
  const isCollapsed = body.classList.toggle('collapsed');
  toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
});
