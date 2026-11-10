import test from 'node:test';
import assert from 'node:assert/strict';
import { getStoredTheme, setStoredTheme } from '../js/theme.js';

test('Theme Switcher - handles storage gracefully in headless/node environment', () => {
  // In Node.js environment without window.localStorage, storage operations shouldn't throw
  assert.equal(typeof getStoredTheme, 'function');
  assert.equal(typeof setStoredTheme, 'function');

  // Should safely return null without throwing
  const theme = getStoredTheme();
  assert.ok(theme === null || typeof theme === 'string');
});
