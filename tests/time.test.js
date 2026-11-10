import test from 'node:test';
import assert from 'node:assert/strict';
import { formatRelativeTime, sortByNewest } from '../js/utils/time.js';

test('formatRelativeTime - formats relative intervals correctly', () => {
  const now = Math.floor(Date.now() / 1000);

  assert.equal(formatRelativeTime(now - 10), 'just now');
  assert.equal(formatRelativeTime(now - 60), '1m ago');
  assert.equal(formatRelativeTime(now - 300), '5m ago');
  assert.equal(formatRelativeTime(now - 3600), '1h ago');
  assert.equal(formatRelativeTime(now - 7200), '2h ago');
  assert.equal(formatRelativeTime(now - 86400), 'yesterday');
  assert.equal(formatRelativeTime(now - 172800), '2d ago');
});

test('sortByNewest - sorts objects descending by time', () => {
  const items = [
    { id: 1, time: 1000 },
    { id: 2, time: 5000 },
    { id: 3, time: 2000 },
    { id: 4, time: 4000 }
  ];

  const sorted = sortByNewest(items);

  assert.equal(sorted[0].id, 2); // 5000
  assert.equal(sorted[1].id, 4); // 4000
  assert.equal(sorted[2].id, 3); // 2000
  assert.equal(sorted[3].id, 1); // 1000
});
