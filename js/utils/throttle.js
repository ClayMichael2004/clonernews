/**
 * Creates a throttled function that only invokes `fn` at most once per
 * every `limitMs` milliseconds. Supports both leading and trailing edges.
 *
 * @param {Function} fn Function to throttle
 * @param {number} limitMs Throttle window in milliseconds
 * @returns {Function} Throttled wrapper function
 */
export function throttle(fn, limitMs) {
  let timerId = null;
  let lastExecuted = 0;

  const throttled = function (...args) {
    const context = this;
    const now = Date.now();
    const elapsed = now - lastExecuted;

    if (elapsed >= limitMs) {
      if (timerId) {
        clearTimeout(timerId);
        timerId = null;
      }
      lastExecuted = now;
      fn.apply(context, args);
    } else if (!timerId) {
      timerId = setTimeout(() => {
        timerId = null;
        lastExecuted = Date.now();
        fn.apply(context, args);
      }, Math.max(0, limitMs - elapsed));
    }
  };

  throttled.cancel = function () {
    if (timerId) {
      clearTimeout(timerId);
      timerId = null;
    }
  };

  return throttled;
}
