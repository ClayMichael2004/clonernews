/**
 * Request Batcher & Concurrency Limiter
 *
 * Runs an array of asynchronous tasks with a strict concurrency limit (Promise Pool),
 * preventing browser connection starvation and API rate-limiting issues.
 */
export class RequestBatcher {
  /**
   * @param {number} concurrency Maximum concurrent active promises
   */
  constructor(concurrency = 6) {
    this.concurrency = Math.max(1, concurrency);
  }

  /**
   * Processes an array of items through an async mapper with bounded concurrency.
   *
   * @template T, R
   * @param {T[]} items Input items
   * @param {(item: T, index: number) => Promise<R>} iteratorFn Async processor for each item
   * @returns {Promise<R[]>} Resolved results preserving the input index order
   */
  async map(items, iteratorFn) {
    if (!Array.isArray(items) || items.length === 0) {
      return [];
    }

    const results = new Array(items.length);
    let currentIndex = 0;

    const worker = async () => {
      while (currentIndex < items.length) {
        const index = currentIndex++;
        try {
          results[index] = await iteratorFn(items[index], index);
        } catch (err) {
          console.warn(`[RequestBatcher] Item index ${index} failed:`, err);
          results[index] = null;
        }
      }
    };

    const workerPool = [];
    const poolSize = Math.min(this.concurrency, items.length);

    for (let i = 0; i < poolSize; i++) {
      workerPool.push(worker());
    }

    await Promise.all(workerPool);
    return results;
  }
}
