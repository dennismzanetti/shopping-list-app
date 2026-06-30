// js/theme.js
// Manages light/dark theme state and DOM sync.
//
// Usage in shopping-list.js:
//   import { syncThemeUI, toggleTheme } from './js/theme.js';

import { state } from './state.js';

const SUN_SVG  = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>';
const MOON_SVG = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';

// Reads state.currentTheme and updates:
//   1. data-theme attribute on <html>  (triggers CSS variable swap)
//   2. Header toggle button icon       (sun <-> moon)
//   3. Settings dark-mode checkbox     (checked state)
export function syncThemeUI() {
  document.documentElement.setAttribute('data-theme', state.currentTheme);
  const btn    = document.getElementById('theme-toggle');
  const toggle = document.getElementById('dark-mode-toggle');
  if (btn)    btn.innerHTML      = state.currentTheme === 'dark' ? SUN_SVG : MOON_SVG;
  if (toggle) toggle.checked     = state.currentTheme === 'dark';
}

// Flips state.currentTheme between 'light' and 'dark', then syncs the UI.
export function toggleTheme() {
  state.currentTheme = state.currentTheme === 'dark' ? 'light' : 'dark';
  syncThemeUI();
}
