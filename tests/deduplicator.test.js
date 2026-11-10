import test from 'node:test';
import assert from 'node:assert/strict';
import { RequestDeduplicator } from '../js/api/deduplicator.js';

test('RequestDeduplicator - coalesces multiple simultaneous requests into one', async () => {
  const dedupe = new RequestDeduplicator();
  let executionCount = 0;

  const mockFetch = async () => {
    executionCount++;
    await new Promise((resolve) => setTimeout(resolve, 50));
    return { data: 42 };
  };

  // Launch 5 simultaneous requests for the exact same key
  const results = await Promise.all([
    dedupe.dedupe('test-key', mockFetch),
    dedupe.dedupe('test-key', mockFetch),
    dedupe.dedupe('test-key', mockFetch),
    dedupe.dedupe('test-key', mockFetch),
    dedupe.dedupe('test-key', mockFetch)
  ]);

  // All 5 callers should receive the exact same response
  assert.equal(results.length, 5);
  for (const res of results) {
    assert.deepEqual(res, { data: 42 });
  }

  // The underlying async function should have been executed ONLY once!
  assert.equal(executionCount, 1, 'mockFetch should have executed exactly once');
  assert.equal(dedupe.size, 0, 'In-flight map should be cleaned up after resolution');
});
