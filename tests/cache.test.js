import test from 'node:test';
import assert from 'node:assert/strict';
import { LRUCache } from '../js/api/cache.js';

test('LRUCache - basic set, get, and eviction', () => {
  const cache = new LRUCache(3);

  cache.set('a', 1);
  cache.set('b', 2);
  cache.set('c', 3);

  assert.equal(cache.size, 3);
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('b'), 2);
  assert.equal(cache.get('c'), 3);

  // Accessing 'a' makes it most recently used, so 'b' is now least recently used
  cache.get('a');
  cache.set('d', 4); // should evict 'b'

  assert.equal(cache.get('b'), undefined, 'Key "b" should have been evicted');
  assert.equal(cache.get('a'), 1);
  assert.equal(cache.get('c'), 3);
  assert.equal(cache.get('d'), 4);
});

test('LRUCache - update existing key', () => {
  const cache = new LRUCache(2);
  cache.set('k1', 'val1');
  cache.set('k2', 'val2');

  // Update k1
  cache.set('k1', 'val1-updated');
  assert.equal(cache.get('k1'), 'val1-updated');

  // Insert k3 -> should evict k2, not k1
  cache.set('k3', 'val3');
  assert.equal(cache.get('k2'), undefined);
  assert.equal(cache.get('k1'), 'val1-updated');
});

test('LRUCache - delete and clear', () => {
  const cache = new LRUCache(5);
  cache.set('1', 'one');
  cache.set('2', 'two');

  cache.delete('1');
  assert.equal(cache.has('1'), false);
  assert.equal(cache.size, 1);

  cache.clear();
  assert.equal(cache.size, 0);
  assert.equal(cache.get('2'), undefined);
});
