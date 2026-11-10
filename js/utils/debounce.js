/**
 * Creates a debounced function that delays invoking `fn` until after
 * `waitMs` milliseconds have elapsed since the last time it was invoked.
 *
 * @param {Function} fn Function to debounce
 * @param {number} waitMs Debounce window in milliseconds
 * @param {boolean} immediate Whether to invoke on the leading edge
 * @returns {Function} Debounced function with .cancel() method
 */
export function debounce(fn, waitMs, immediate = false) {
  let timeoutId = null;

  const debounced = function (...args) {
    const context = this;
    const callNow = immediate && !timeoutId;

    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      timeoutId = null;
      if (!immediate) {
        fn.apply(context, args);
      }
    }, waitMs);

    if (callNow) {
      fn.apply(context, args);
    }
  };

  debounced.cancel = function () {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
}
