/**
 * Enterprise Theme Switcher Module
 * Handles dark / light theme toggling with localStorage persistence
 * and system preference detection.
 */

const STORAGE_KEY = 'clonernews-theme';

export function getStoredTheme() {
  try {
    return localStorage.getItem(STORAGE_KEY) || localStorage.getItem('theme');
  } catch {
    return null;
  }
}

export function setStoredTheme(theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
    localStorage.setItem('theme', theme);
  } catch {
    // Ignore storage restrictions (e.g. strict private browsing)
  }
}

export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || 'dark';
}

export function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  setStoredTheme(theme);
  announceThemeChange(theme);
}

export function toggleTheme() {
  const current = getCurrentTheme();
  const next = current === 'light' ? 'dark' : 'light';
  applyTheme(next);
  return next;
}

export function initTheme() {
  const stored = getStoredTheme();
  if (stored) {
    document.documentElement.setAttribute('data-theme', stored);
  } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
    document.documentElement.setAttribute('data-theme', 'light');
  } else {
    document.documentElement.setAttribute('data-theme', 'dark');
  }

  // Listen for system changes if user hasn't explicitly set a preference
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
      if (!getStoredTheme()) {
        applyTheme(e.matches ? 'light' : 'dark');
      }
    });
  }
}

function announceThemeChange(theme) {
  let liveRegion = document.getElementById('theme-announcer');
  if (!liveRegion && typeof document !== 'undefined') {
    liveRegion = document.createElement('div');
    liveRegion.id = 'theme-announcer';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.style.position = 'absolute';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.margin = '-1px';
    liveRegion.style.overflow = 'hidden';
    liveRegion.style.clip = 'rect(0, 0, 0, 0)';
    liveRegion.style.whiteSpace = 'nowrap';
    liveRegion.style.border = '0';
    document.body.appendChild(liveRegion);
  }

  if (liveRegion) {
    liveRegion.textContent = `Theme changed to ${theme} mode.`;
  }
}
