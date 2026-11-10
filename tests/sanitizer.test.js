import test from 'node:test';
import assert from 'node:assert/strict';
import { sanitizeHTML, escapeHTML } from '../js/utils/sanitizer.js';

test('escapeHTML - escapes special HTML characters', () => {
  const unsafe = '<script>alert("XSS & \'hack\'")</script>';
  const escaped = escapeHTML(unsafe);

  assert.ok(!escaped.includes('<script>'));
  assert.ok(escaped.includes('&lt;script&gt;'));
  assert.ok(escaped.includes('&quot;'));
  assert.ok(escaped.includes('&#39;'));
  assert.ok(escaped.includes('&amp;'));
});

test('sanitizeHTML - strips harmful tags and javascript: links', () => {
  const malicious = '<script>alert(1)</script><p>Safe text</p><a href="javascript:alert(2)">Bad link</a>';
  const clean = sanitizeHTML(malicious);

  assert.ok(!clean.includes('<script>'), 'Must strip <script>');
  assert.ok(!clean.includes('alert(1)'), 'Must strip script content');
  assert.ok(!clean.includes('javascript:alert(2)'), 'Must strip javascript: URI');
  assert.ok(clean.includes('Safe text'), 'Must preserve safe text');
});
