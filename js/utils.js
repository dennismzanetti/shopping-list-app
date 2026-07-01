// -- Utils -------------------------------------------------------------------
export function escHtml(str) {
  return String(str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

export function createIcons() {
  if (window.lucide) window.lucide.createIcons();
}
