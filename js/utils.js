// ── Utils ───────────────────────────────────────────────────────────────────
// No dependencies on any other app module.

export function escHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function toArray(val) {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === 'string' && val.trim())
    return val.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

export function createIcons() {
  if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
}
