/**
 * In-flight Request Deduplicator
 *
 * Ensures that if multiple components or concurrent routines request the same
 * network resource simultaneously, only a single HTTP request is issued. All
 * callers share the exact same underlying Promise.
 */
export class RequestDeduplicator {
  constructor() {
    this.inFlight = new Map();
  }

  /**
   * Executes or shares an in-flight async request identified by `key`.
   *
   * @template T
   * @param {string|number} key Unique identifier for the request
   * @param {() => Promise<T>} fetchFn Function returning the promise
   * @returns {Promise<T>}
   */
  dedupe(key, fetchFn) {
    const stringKey = String(key);

    if (this.inFlight.has(stringKey)) {
      return this.inFlight.get(stringKey);
    }

    const promise = Promise.resolve()
      .then(() => fetchFn())
      .finally(() => {
        this.inFlight.delete(stringKey);
      });

    this.inFlight.set(stringKey, promise);
    return promise;
  }

  /**
   * Current number of ongoing in-flight requests.
   * @returns {number}
   */
  get size() {
    return this.inFlight.size;
  }

  /**
   * Checks if an in-flight request exists for `key`.
   * @param {string|number} key
   * @returns {boolean}
   */
  has(key) {
    return this.inFlight.has(String(key));
  }
}
