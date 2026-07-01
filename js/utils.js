// -- Utils -------------------------------------------------------------------
export function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

export function toArray(val) {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  return [val];
}

export function createIcons() {
  if (window.lucide) window.lucide.createIcons();
}
