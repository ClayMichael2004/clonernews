/**
 * Theme Switcher Module
 * Handles dark/light theme toggling with localStorage persistence
 * and system preference detection.
 */

const html = document.documentElement;

// Sun icon SVG
const SUN_SVG = `<svg class="icon-sun" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="5"></circle><line x1="12" y1="1" x2="12" y2="3"></line><line x1="12" y1="21" x2="12" y2="23"></line><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line><line x1="1" y1="12" x2="3" y2="12"></line><line x1="21" y1="12" x2="23" y2="12"></line><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line></svg>`;

// Moon icon SVG
const MOON_SVG = `<svg class="icon-moon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>`;

export function initTheme() {
  const savedTheme = getStoredTheme();
  const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;

  // Apply initial theme (already set by inline script, but ensure consistency)
  if (savedTheme) {
    html.setAttribute('data-theme', savedTheme);
  } else if (prefersLight) {
    html.setAttribute('data-theme', 'light');
  }

  // Create and inject theme toggle button
  createThemeToggle();

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', (e) => {
    if (!getStoredTheme()) {
      html.setAttribute('data-theme', e.matches ? 'light' : 'dark');
      updateToggleIcon(e.matches ? 'light' : 'dark');
    }
  });
}

function getStoredTheme() {
  try {
    return localStorage.getItem('theme');
  } catch (e) {
    return null;
  }
}

function setStoredTheme(theme) {
  try {
    localStorage.setItem('theme', theme);
  } catch (e) {
    // Ignore storage errors (private browsing, etc.)
  }
}

function createThemeToggle() {
  const toggle = document.createElement('button');
  toggle.className = 'theme-toggle';
  toggle.setAttribute('aria-label', 'Toggle theme');
  toggle.setAttribute('title', 'Toggle theme (dark/light)');
  toggle.innerHTML = `
    ${SUN_SVG}
    ${MOON_SVG}
  `;

  toggle.addEventListener('click', () => {
    const currentTheme = html.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    html.setAttribute('data-theme', newTheme);
    setStoredTheme(newTheme);
    updateToggleIcon(newTheme);

    // Announce to screen readers
    announceThemeChange(newTheme);
  });

  // Keyboard support
  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggle.click();
    }
  });

  document.body.appendChild(toggle);

  // Set initial icon state
  const currentTheme = html.getAttribute('data-theme') || 'dark';
  updateToggleIcon(currentTheme);
}

function updateToggleIcon(theme) {
  const toggle = document.querySelector('.theme-toggle');
  if (!toggle) return;

  const sunIcon = toggle.querySelector('.icon-sun');
  const moonIcon = toggle.querySelector('.icon-moon');

  if (theme === 'light') {
    toggle.setAttribute('aria-label', 'Switch to dark mode');
    toggle.setAttribute('title', 'Switch to dark mode');
    if (sunIcon) sunIcon.style.display = 'block';
    if (moonIcon) moonIcon.style.display = 'none';
  } else {
    toggle.setAttribute('aria-label', 'Switch to light mode');
    toggle.setAttribute('title', 'Switch to light mode');
    if (sunIcon) sunIcon.style.display = 'none';
    if (moonIcon) moonIcon.style.display = 'block';
  }
}

function announceThemeChange(theme) {
  // Create a live region for screen readers
  let liveRegion = document.getElementById('theme-announcer');
  if (!liveRegion) {
    liveRegion = document.createElement('div');
    liveRegion.id = 'theme-announcer';
    liveRegion.setAttribute('role', 'status');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.style.position = 'absolute';
    liveRegion.style.width = '1px';
    liveRegion.style.height = '1px';
    liveRegion.style.padding = '0';
    liveRegion.style.margin = '-1px';
    liveRegion.style.overflow = 'hidden';
    liveRegion.style.clip = 'rect(0, 0, 0, 0)';
    liveRegion.style.whiteSpace = 'nowrap';
    liveRegion.style.border = '0';
    document.body.appendChild(liveRegion);
  }

  liveRegion.textContent = `Theme changed to ${theme} mode`;
}