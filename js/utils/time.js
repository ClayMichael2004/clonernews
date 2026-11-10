/**
 * Time formatting and sorting utilities for Hacker News timestamps (seconds since epoch)
 */

/**
 * Formats a Unix timestamp (in seconds) into a human-readable relative time string.
 * @param {number} unixSeconds
 * @returns {string} e.g. "just now", "5m ago", "2h ago", "3d ago"
 */
export function formatRelativeTime(unixSeconds) {
  if (!unixSeconds || typeof unixSeconds !== 'number') {
    return 'unknown time';
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const diffSeconds = Math.max(0, nowSeconds - unixSeconds);

  if (diffSeconds < 45) {
    return 'just now';
  }
  if (diffSeconds < 90) {
    return '1m ago';
  }
  if (diffSeconds < 3600) {
    return `${Math.floor(diffSeconds / 60)}m ago`;
  }
  if (diffSeconds < 7200) {
    return '1h ago';
  }
  if (diffSeconds < 86400) {
    return `${Math.floor(diffSeconds / 3600)}h ago`;
  }
  if (diffSeconds < 172800) {
    return 'yesterday';
  }
  if (diffSeconds < 604800) {
    return `${Math.floor(diffSeconds / 86400)}d ago`;
  }
  if (diffSeconds < 2592000) {
    return `${Math.floor(diffSeconds / 604800)}w ago`;
  }
  if (diffSeconds < 31536000) {
    return `${Math.floor(diffSeconds / 2592000)}mo ago`;
  }
  return `${Math.floor(diffSeconds / 31536000)}y ago`;
}

/**
 * Formats a Unix timestamp into a full localized date and time string.
 * @param {number} unixSeconds
 * @returns {string}
 */
export function formatFullDateTime(unixSeconds) {
  if (!unixSeconds || typeof unixSeconds !== 'number') {
    return 'Unknown date';
  }
  const date = new Date(unixSeconds * 1000);
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Sorts an array of objects having a `time` field in descending order (newest to oldest).
 * Does not mutate original array if pure is true.
 *
 * @template T
 * @param {T[]} items
 * @param {boolean} pure
 * @returns {T[]}
 */
export function sortByNewest(items, pure = true) {
  if (!Array.isArray(items)) return [];
  const target = pure ? [...items] : items;
  return target.sort((a, b) => {
    const timeA = typeof a?.time === 'number' ? a.time : 0;
    const timeB = typeof b?.time === 'number' ? b.time : 0;
    return timeB - timeA;
  });
}
