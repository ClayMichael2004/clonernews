import test from 'node:test';
import assert from 'node:assert/strict';
import { throttle } from '../js/utils/throttle.js';
import { debounce } from '../js/utils/debounce.js';

test('throttle - limits calls to at most once per window', async () => {
  let counter = 0;
  const fn = () => { counter++; };
  const throttled = throttle(fn, 100);

  // Call 4 times rapidly
  throttled();
  throttled();
  throttled();
  throttled();

  // First call fires immediately on leading edge
  assert.equal(counter, 1);

  // Wait 130ms for the trailing edge to execute (at t=100ms)
  await new Promise((resolve) => setTimeout(resolve, 130));
  assert.equal(counter, 2, 'Trailing call should have fired at t=100ms');

  // Wait another 120ms so elapsed time since trailing call exceeds 100ms
  await new Promise((resolve) => setTimeout(resolve, 120));

  // Now a new call fires immediately
  throttled();
  assert.equal(counter, 3, 'New call after window should fire immediately');
});

test('debounce - delays execution until quiet period', async () => {
  let counter = 0;
  let lastArg = null;
  const fn = (val) => {
    counter++;
    lastArg = val;
  };

  const debounced = debounce(fn, 60);

  debounced('a');
  debounced('b');
  debounced('c');

  assert.equal(counter, 0, 'Should not fire immediately');

  await new Promise((resolve) => setTimeout(resolve, 100));

  assert.equal(counter, 1, 'Should fire exactly once after silence');
  assert.equal(lastArg, 'c', 'Should receive the latest argument');
});
