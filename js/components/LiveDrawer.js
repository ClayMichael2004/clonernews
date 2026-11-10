/**
 * Live Updates Drawer Component
 *
 * Dedicated section surfacing real-time Hacker News activity, refreshed on
 * the 5-second polling interval with merge-into-feed capabilities.
 */

import { formatRelativeTime } from '../utils/time.js';
import { escapeHTML } from '../utils/sanitizer.js';

export class LiveDrawer {
  /**
   * @param {Object} options
   * @param {HTMLElement} options.container
   * @param {import('../state/store.js').Store} options.store
   * @param {Object} options.actions
   */
  constructor({ container, store, actions }) {
    this.container = container;
    this.store = store;
    this.actions = actions;

    this.render();
    this.bindEvents();

    this.store.subscribe((state, prev) => {
      if (
        state.isLiveDrawerOpen !== prev.isLiveDrawerOpen ||
        state.liveUpdates !== prev.liveUpdates ||
        state.liveUpdateCount !== prev.liveUpdateCount ||
        state.lastLiveCheck !== prev.lastLiveCheck
      ) {
        this.update(state);
      }
    });
  }

  render() {
    this.container.innerHTML = `
      <div class="live-drawer-backdrop" id="live-drawer-backdrop"></div>
      <aside class="live-drawer" id="live-drawer" aria-label="Live updates panel">
        <header class="live-drawer-header">
          <div class="drawer-title-group">
            <span class="live-indicator-pulse"></span>
            <h2>Live Data Stream</h2>
          </div>
          <button class="live-drawer-close-btn" id="live-drawer-close-btn" aria-label="Close panel">&times;</button>
        </header>

        <div class="live-drawer-status-bar">
          <span class="cadence-badge">⏱ Regulated 5s Cadence</span>
          <span class="last-checked" id="live-last-checked">Listening...</span>
        </div>

        <div class="live-drawer-actions">
          <button class="btn btn-primary btn-block" id="live-merge-all-btn">
            📥 Merge All New Items into Feed
          </button>
        </div>

        <div class="live-items-list" id="live-items-list">
          <div class="live-empty-state">
            <p>Waiting for live stream updates from Hacker News...</p>
            <small>Live poller queries /v0/updates.json every 5 seconds.</small>
          </div>
        </div>
      </aside>
    `;
  }

  bindEvents() {
    const backdrop = this.container.querySelector('#live-drawer-backdrop');
    const closeBtn = this.container.querySelector('#live-drawer-close-btn');
    const mergeBtn = this.container.querySelector('#live-merge-all-btn');
    const itemsList = this.container.querySelector('#live-items-list');

    backdrop.addEventListener('click', () => this.actions.setLiveDrawerOpen(false));
    closeBtn.addEventListener('click', () => this.actions.setLiveDrawerOpen(false));

    mergeBtn.addEventListener('click', () => {
      this.actions.mergeLiveUpdates();
      this.actions.setLiveDrawerOpen(false);
    });

    itemsList.addEventListener('click', (e) => {
      const openBtn = e.target.closest('[data-action="open-live-item"]');
      if (openBtn) {
        const id = openBtn.dataset.id;
        if (id) {
          this.actions.openPost(id);
          this.actions.setLiveDrawerOpen(false);
        }
      }
    });
  }

  update(state) {
    const drawer = this.container.querySelector('#live-drawer');
    const backdrop = this.container.querySelector('#live-drawer-backdrop');
    const itemsList = this.container.querySelector('#live-items-list');
    const lastChecked = this.container.querySelector('#live-last-checked');
    const mergeBtn = this.container.querySelector('#live-merge-all-btn');

    // Toggle open state
    if (drawer && backdrop) {
      drawer.classList.toggle('open', state.isLiveDrawerOpen);
      backdrop.classList.toggle('open', state.isLiveDrawerOpen);
    }

    if (lastChecked && state.lastLiveCheck) {
      lastChecked.textContent = `Last polled: ${new Date(state.lastLiveCheck).toLocaleTimeString()}`;
    }

    if (mergeBtn) {
      mergeBtn.disabled = !state.liveUpdates || state.liveUpdates.length === 0;
      mergeBtn.textContent = state.liveUpdates?.length
        ? `📥 Merge ${state.liveUpdates.length} New Items into Feed`
        : 'Feed Up to Date';
    }

    if (itemsList) {
      if (!state.liveUpdates || state.liveUpdates.length === 0) {
        itemsList.innerHTML = `
          <div class="live-empty-state">
            <p>No unmerged live updates right now.</p>
            <small>Listening for live changes every 5 seconds...</small>
          </div>
        `;
        return;
      }

      itemsList.innerHTML = state.liveUpdates
        .map((item) => {
          const type = item.type || 'story';
          const title = escapeHTML(item.title || `Item #${item.id}`);
          const author = escapeHTML(item.by || 'anonymous');
          const time = formatRelativeTime(item.time);

          return `
            <div class="live-item-card" data-id="${item.id}">
              <div class="live-item-header">
                <span class="type-badge badge-${type}">${type.toUpperCase()}</span>
                <span class="live-item-time">🕒 ${time}</span>
              </div>
              <h4 class="live-item-title">${title}</h4>
              <div class="live-item-footer">
                <span class="live-item-author">by @${author}</span>
                <button class="btn btn-sm btn-outline" data-action="open-live-item" data-id="${item.id}">
                  Inspect →
                </button>
              </div>
            </div>
          `;
        })
        .join('');
    }
  }
}
