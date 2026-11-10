/**
 * Live Update Service
 *
 * Polls Hacker News Live Data endpoints (/updates.json, /maxitem.json)
 * on a regulated 5-second interval using throttling to eliminate request flooding.
 */

import { CONFIG } from '../config.js';
import { throttle } from '../utils/throttle.js';
import { sortByNewest } from '../utils/time.js';

export class LiveUpdateService {
  /**
   * @param {Object} options
   * @param {import('../api/hnClient.js').HNClient} options.hnClient
   * @param {import('../state/store.js').Store} options.store
   * @param {import('./notificationService.js').NotificationService} options.notificationService
   * @param {Function} [options.onMerge]
   */
  constructor({ hnClient, store, notificationService, onMerge }) {
    this.hnClient = hnClient;
    this.store = store;
    this.notificationService = notificationService;
    this.onMerge = onMerge;
    
    this.pollIntervalMs = CONFIG.LIVE_POLL_INTERVAL_MS; // 5000ms
    this.timerId = null;
    this.isRunning = false;
    this.lastMaxItem = null;
    this.knownItemIds = new Set();
    this.isPolling = false;

    // Regulate poll triggers with throttle
    this.throttledPoll = throttle(this._performPoll.bind(this), this.pollIntervalMs);
  }

  /**
   * Starts the 5-second live polling loop.
   */
  start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    // Initial poll
    this.throttledPoll();

    this.timerId = setInterval(() => {
      if (this.isRunning) {
        this.throttledPoll();
      }
    }, this.pollIntervalMs);

    console.log(`[LiveUpdateService] Started polling every ${this.pollIntervalMs}ms.`);
  }

  /**
   * Stops polling.
   */
  stop() {
    this.isRunning = false;
    if (this.timerId) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    console.log('[LiveUpdateService] Stopped polling.');
  }

  /**
   * Executes a single polling iteration against /updates.json.
   */
  async _performPoll() {
    if (this.isPolling) return;
    this.isPolling = true;

    try {
      const { items: updatedItemIds, maxItem } = await this.hnClient.getLiveUpdates();
      const now = Date.now();

      this.store.setState({ lastLiveCheck: now });

      if (!Array.isArray(updatedItemIds) || updatedItemIds.length === 0) {
        return;
      }

      // Check for first boot initialization
      if (this.lastMaxItem === null) {
        this.lastMaxItem = maxItem || updatedItemIds[0];
        for (const id of updatedItemIds) {
          this.knownItemIds.add(id);
        }
        return;
      }

      // Filter only new or genuinely updated items
      const state = this.store.getState();
      const currentPostIds = state.visiblePostIds || new Set();

      const changedInFeed = [];
      const brandNewItems = [];

      for (const id of updatedItemIds.slice(0, 10)) {
        if (currentPostIds.has(id)) {
          // This post is currently visible on user's feed and received an update!
          changedInFeed.push(id);
        } else if (!this.knownItemIds.has(id)) {
          brandNewItems.push(id);
          this.knownItemIds.add(id);
        }
      }

      if (maxItem && maxItem > this.lastMaxItem) {
        this.lastMaxItem = maxItem;
      }

      // 1. If any currently displayed posts have updated (e.g. score or comment count changed)
      if (changedInFeed.length > 0) {
        const updatedPosts = await this.hnClient.getItems(changedInFeed);
        const validUpdated = updatedPosts.filter(Boolean);

        if (validUpdated.length > 0) {
          const currentPosts = [...state.posts];
          let updatedAny = false;

          for (const upd of validUpdated) {
            const index = currentPosts.findIndex((p) => p.id === upd.id);
            if (index !== -1) {
              const old = currentPosts[index];
              // Only update if score or comments count changed
              if (old.score !== upd.score || old.descendants !== upd.descendants) {
                currentPosts[index] = { ...old, ...upd };
                updatedAny = true;

                this.notificationService?.showToast({
                  title: 'Story Updated',
                  message: `"${upd.title || 'Story #' + upd.id}" received new activity (${upd.score} pts, ${upd.descendants || 0} comments)`,
                  type: 'info',
                  duration: 4000
                });
              }
            }
          }

          if (updatedAny) {
            this.store.setState({ posts: currentPosts });
          }
        }
      }

      // 2. If new items have arrived
      if (brandNewItems.length > 0) {
        const fetchedNew = await this.hnClient.getItems(brandNewItems.slice(0, 5));
        const validNewStories = fetchedNew.filter(
          (item) => item && (item.type === 'story' || item.type === 'job' || item.type === 'poll')
        );

        if (validNewStories.length > 0) {
          const currentLiveUpdates = [...this.store.getState().liveUpdates];
          const combined = [...validNewStories, ...currentLiveUpdates];
          const sorted = sortByNewest(combined);

          this.store.setState({
            liveUpdates: sorted.slice(0, 30),
            liveUpdateCount: this.store.getState().liveUpdateCount + validNewStories.length
          });

          // Notify user every 5s cadence when live data updates
          const newest = validNewStories[0];
          this.notificationService?.showToast({
            title: `🔔 Live Update (${validNewStories.length} new items)`,
            message: newest.title ? `"${newest.title}" by ${newest.by}` : 'New items have arrived on Hacker News.',
            type: 'success',
            duration: 5000,
            actionText: 'Merge into Feed',
            onAction: () => {
              if (typeof this.onMerge === 'function') {
                this.onMerge();
              }
            }
          });
        }
      }
    } catch (err) {
      console.warn('[LiveUpdateService] Error during poll cycle:', err);
    } finally {
      this.isPolling = false;
    }
  }
}
