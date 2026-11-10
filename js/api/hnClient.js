/**
 * Hacker News API Client Layer
 *
 * Provides resilient, cached, deduplicated, and concurrency-controlled
 * access to the official Hacker News Firebase REST API and auxiliary indices.
 */

import { CONFIG } from '../config.js';
import { LRUCache } from './cache.js';
import { RequestDeduplicator } from './deduplicator.js';
import { RequestBatcher } from './requestBatcher.js';
import { buildCommentTree } from '../utils/commentTree.js';
import { sortByNewest } from '../utils/time.js';

export class HNClient {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || CONFIG.HN_API_BASE;
    this.algoliaUrl = options.algoliaUrl || CONFIG.ALGOLIA_API_BASE;
    this.cache = new LRUCache(options.cacheCapacity || CONFIG.LRU_CACHE_CAPACITY);
    this.deduplicator = new RequestDeduplicator();
    this.batcher = new RequestBatcher(options.concurrency || CONFIG.MAX_CONCURRENT_REQUESTS);
    this.maxRetries = options.maxRetries || CONFIG.MAX_RETRIES;
    this.retryDelayMs = options.retryDelayMs || CONFIG.INITIAL_RETRY_DELAY_MS;
    this.timeoutMs = options.timeoutMs || CONFIG.REQUEST_TIMEOUT_MS;
  }

  /**
   * Performs an HTTP GET request with timeout and exponential backoff retry.
   * @param {string} url
   * @param {number} attempt
   * @returns {Promise<any>}
   */
  async _fetchWithRetry(url, attempt = 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { Accept: 'application/json' }
      });

      clearTimeout(timer);

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText} for ${url}`);
      }

      return await response.json();
    } catch (err) {
      clearTimeout(timer);

      if (attempt <= this.maxRetries) {
        const jitter = Math.random() * 200;
        const delay = this.retryDelayMs * Math.pow(2, attempt - 1) + jitter;
        await new Promise((resolve) => setTimeout(resolve, delay));
        return this._fetchWithRetry(url, attempt + 1);
      }
      throw err;
    }
  }

  /**
   * Fetches an individual item by ID with LRU caching & in-flight deduplication.
   * @param {number|string} id Item ID
   * @param {boolean} forceRefresh Ignore cache if true
   * @returns {Promise<Object|null>}
   */
  async getItem(id, forceRefresh = false) {
    if (!id) return null;
    const key = String(id);

    if (!forceRefresh && this.cache.has(key)) {
      return this.cache.get(key);
    }

    return this.deduplicator.dedupe(`item_${key}`, async () => {
      try {
        const url = `${this.baseUrl}/item/${id}.json`;
        const data = await this._fetchWithRetry(url);
        if (data && typeof data === 'object') {
          this.cache.set(key, data);
        }
        return data;
      } catch (err) {
        console.warn(`[HNClient] Failed to load item ${id}:`, err);
        return null;
      }
    });
  }

  /**
   * Batch fetches a list of item IDs with bounded concurrency.
   * @param {Array<number|string>} idList
   * @returns {Promise<Array<Object>>}
   */
  async getItems(idList) {
    if (!Array.isArray(idList) || idList.length === 0) {
      return [];
    }

    return this.batcher.map(idList, async (id) => {
      return this.getItem(id);
    });
  }

  /**
   * Retrieves item IDs for a given feed category.
   * @param {string} feedId e.g. 'new', 'top', 'best', 'jobs', 'polls', 'ask', 'show'
   * @returns {Promise<number[]>} Array of item IDs
   */
  async getFeedIds(feedId) {
    // Dedicated handling for community polls
    if (feedId === 'polls') {
      return this.getPollIds();
    }

    const feedConfig = CONFIG.FEEDS[feedId?.toUpperCase()] || CONFIG.FEEDS.NEW;
    const url = `${this.baseUrl}${feedConfig.endpoint}`;

    return this.deduplicator.dedupe(`feed_${feedId}`, async () => {
      try {
        const ids = await this._fetchWithRetry(url);
        return Array.isArray(ids) ? ids : [];
      } catch (err) {
        console.error(`[HNClient] Failed to fetch feed IDs for ${feedId}:`, err);
        throw err;
      }
    });
  }

  /**
   * Discovers and retrieves active Hacker News Poll IDs.
   * Uses Algolia HN index to find real poll IDs, ensuring genuine poll data.
   * @returns {Promise<number[]>}
   */
  async getPollIds() {
    return this.deduplicator.dedupe('feed_polls', async () => {
      try {
        const url = `${this.algoliaUrl}/search_by_date?tags=poll&hitsPerPage=40`;
        const result = await this._fetchWithRetry(url);
        if (result && Array.isArray(result.hits)) {
          return result.hits
            .map((hit) => Number(hit.objectID))
            .filter((id) => !isNaN(id) && id > 0);
        }
      } catch (err) {
        console.warn('[HNClient] Algolia poll discovery failed, falling back to curated poll items:', err);
      }

      // Robust fallback list of historical & famous HN poll IDs if Algolia is unreachable
      return [50350977, 50305607, 50184702, 126809, 160705, 23889];
    });
  }

  /**
   * Fetches poll option parts for a poll item and attaches enriched details.
   * @param {Object} pollItem
   * @returns {Promise<Object>} Enriched poll item with pollOptions
   */
  async getPollDetails(pollItem) {
    if (!pollItem || !Array.isArray(pollItem.parts) || pollItem.parts.length === 0) {
      return { ...pollItem, pollOptions: [], totalVotes: 0 };
    }

    const options = await this.getItems(pollItem.parts);
    const validOptions = options.filter(Boolean);

    const totalVotes = validOptions.reduce((sum, opt) => sum + (opt.score || 0), 0);

    const enrichedOptions = validOptions.map((opt) => ({
      id: opt.id,
      text: opt.text || '(empty option)',
      score: opt.score || 0,
      by: opt.by || 'unknown',
      percentage: totalVotes > 0 ? Math.round(((opt.score || 0) / totalVotes) * 100) : 0
    }));

    // Poll options can be sorted by score or chronological order
    enrichedOptions.sort((a, b) => b.score - a.score);

    return {
      ...pollItem,
      pollOptions: enrichedOptions,
      totalVotes
    };
  }

  /**
   * Fetches the complete hierarchical comment thread for a given post.
   * All comments at every level are strictly sorted from newest to oldest.
   *
   * @param {Object} postItem Post item containing kids: [...]
   * @param {number} maxComments Safeguard cap to prevent runaway fetching on massive posts
   * @returns {Promise<Array<import('../utils/commentTree.js').CommentNode>>}
   */
  async getCommentTree(postItem, maxComments = 120) {
    if (!postItem || !Array.isArray(postItem.kids) || postItem.kids.length === 0) {
      return [];
    }

    const fetchedComments = [];
    const queue = [...postItem.kids];
    const visited = new Set();

    while (queue.length > 0 && fetchedComments.length < maxComments) {
      const batchIds = queue.splice(0, 15);
      const uniqueBatch = batchIds.filter((id) => !visited.has(id));
      for (const id of uniqueBatch) visited.add(id);

      if (uniqueBatch.length === 0) continue;

      const items = await this.getItems(uniqueBatch);

      for (const comment of items) {
        if (!comment || comment.type !== 'comment') continue;
        fetchedComments.push(comment);

        if (Array.isArray(comment.kids)) {
          for (const kidId of comment.kids) {
            if (!visited.has(kidId)) {
              queue.push(kidId);
            }
          }
        }
      }
    }

    return buildCommentTree(fetchedComments, postItem.id);
  }

  /**
   * Fetches Live Data updates from the official HN API.
   * Returns item IDs that have recently updated, and current maxitem.
   * @returns {Promise<{ items: number[], profiles: string[], maxItem: number }>}
   */
  async getLiveUpdates() {
    try {
      const [updates, maxItem] = await Promise.all([
        this._fetchWithRetry(`${this.baseUrl}/updates.json`),
        this._fetchWithRetry(`${this.baseUrl}/maxitem.json`).catch(() => null)
      ]);

      return {
        items: Array.isArray(updates?.items) ? updates.items : [],
        profiles: Array.isArray(updates?.profiles) ? updates.profiles : [],
        maxItem: typeof maxItem === 'number' ? maxItem : null
      };
    } catch (err) {
      console.warn('[HNClient] Failed to fetch live updates:', err);
      return { items: [], profiles: [], maxItem: null };
    }
  }

  /**
   * Search posts using Algolia index.
   * @param {string} query Search query string
   * @param {string} tag Optional tag filter: 'story', 'job', 'poll'
   * @returns {Promise<Array<Object>>}
   */
  async search(query, tag = null) {
    if (!query || query.trim().length === 0) return [];

    let url = `${this.algoliaUrl}/search_by_date?query=${encodeURIComponent(query)}&hitsPerPage=30`;
    if (tag) {
      url += `&tags=${encodeURIComponent(tag)}`;
    }

    try {
      const data = await this._fetchWithRetry(url);
      if (data && Array.isArray(data.hits)) {
        return data.hits.map((hit) => ({
          id: Number(hit.objectID),
          title: hit.title || hit.story_title || 'Untitled',
          by: hit.author || 'anonymous',
          score: hit.points || 0,
          time: Math.floor(new Date(hit.created_at).getTime() / 1000),
          url: hit.url,
          text: hit.story_text || hit.comment_text || null,
          descendants: hit.num_comments || 0,
          type: hit._tags?.includes('job')
            ? 'job'
            : hit._tags?.includes('poll')
            ? 'poll'
            : 'story'
        }));
      }
      return [];
    } catch (err) {
      console.warn('[HNClient] Search query failed:', err);
      return [];
    }
  }
}
