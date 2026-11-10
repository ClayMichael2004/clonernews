/**
 * Header Component
 *
 * Renders navigation, feed tabs, search input, live update counter,
 * and sorting/filtering controls.
 */

import { CONFIG } from '../config.js';
import { debounce } from '../utils/debounce.js';

export class Header {
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

    this.debouncedSearch = debounce((query) => {
      this.actions.search(query);
    }, CONFIG.SEARCH_DEBOUNCE_MS);

    this.render();
    this.bindEvents();

    this.store.subscribe((state, prev) => {
      if (
        state.activeFeed !== prev.activeFeed ||
        state.liveUpdateCount !== prev.liveUpdateCount ||
        state.filterType !== prev.filterType ||
        state.sortBy !== prev.sortBy ||
        state.isLiveDrawerOpen !== prev.isLiveDrawerOpen
      ) {
        this.updateDynamicElements(state);
      }
    });
  }

  render() {
    this.container.innerHTML = `
      <div class="header-inner">
        <div class="header-brand">
          <div class="brand-logo" aria-label="Logo">
            <span class="logo-y">Y</span>
          </div>
          <div class="brand-titles">
            <h1 class="brand-name">ClonerNews</h1>
            <span class="brand-subtitle">Real-time Hacker News Reader</span>
          </div>
        </div>

        <nav class="feed-nav" aria-label="Hacker News Feeds">
          <button class="nav-tab active" data-feed="new">⚡ New</button>
          <button class="nav-tab" data-feed="top">🔥 Top</button>
          <button class="nav-tab" data-feed="jobs">💼 Jobs</button>
          <button class="nav-tab" data-feed="polls">📊 Polls</button>
          <button class="nav-tab" data-feed="ask">❓ Ask HN</button>
          <button class="nav-tab" data-feed="show">💡 Show HN</button>
        </nav>

        <div class="header-actions">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input
              type="search"
              id="search-input"
              class="search-input"
              placeholder="Search stories, jobs, polls..."
              aria-label="Search stories, jobs, polls"
            />
            <button id="search-clear-btn" class="search-clear-btn hidden" aria-label="Clear search">&times;</button>
          </div>

          <div class="header-controls">
            <select id="filter-type-select" class="control-select" aria-label="Filter post type">
              <option value="all">Filter: All Types</option>
              <option value="story">Stories only</option>
              <option value="job">Jobs only</option>
              <option value="poll">Polls only</option>
            </select>

            <select id="sort-by-select" class="control-select" aria-label="Sort order">
              <option value="newest" selected>Order: Newest First</option>
              <option value="score">Order: Top Score</option>
              <option value="comments">Order: Most Comments</option>
            </select>

            <button id="live-drawer-toggle-btn" class="live-status-btn" title="Live Data Stream (updates every 5s)">
              <span class="live-pulse-dot"></span>
              <span class="live-label">LIVE</span>
              <span id="live-badge-count" class="live-badge-count hidden">0</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Nav tabs click
    const navTabs = this.container.querySelectorAll('.nav-tab');
    navTabs.forEach((tab) => {
      tab.addEventListener('click', (e) => {
        const feedId = e.currentTarget.dataset.feed;
        if (feedId) {
          this.actions.changeFeed(feedId);
        }
      });
    });

    // Search input
    const searchInput = this.container.querySelector('#search-input');
    const searchClear = this.container.querySelector('#search-clear-btn');

    searchInput.addEventListener('input', (e) => {
      const val = e.target.value;
      searchClear.classList.toggle('hidden', val.length === 0);
      this.debouncedSearch(val);
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.classList.add('hidden');
      this.actions.search('');
    });

    // Filter select
    const filterSelect = this.container.querySelector('#filter-type-select');
    filterSelect.addEventListener('change', (e) => {
      this.actions.setFilterType(e.target.value);
    });

    // Sort select
    const sortSelect = this.container.querySelector('#sort-by-select');
    sortSelect.addEventListener('change', (e) => {
      this.actions.setSortBy(e.target.value);
    });

    // Live drawer toggle
    const liveBtn = this.container.querySelector('#live-drawer-toggle-btn');
    liveBtn.addEventListener('click', () => {
      const isOpen = this.store.getState().isLiveDrawerOpen;
      this.actions.setLiveDrawerOpen(!isOpen);
    });
  }

  updateDynamicElements(state) {
    // Update active nav tab
    const tabs = this.container.querySelectorAll('.nav-tab');
    tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.feed === state.activeFeed && !state.searchQuery);
    });

    // Update live badge count
    const badge = this.container.querySelector('#live-badge-count');
    if (badge) {
      if (state.liveUpdateCount > 0) {
        badge.textContent = state.liveUpdateCount > 99 ? '99+' : state.liveUpdateCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

    // Update select values if changed externally
    const filterSelect = this.container.querySelector('#filter-type-select');
    if (filterSelect && filterSelect.value !== state.filterType) {
      filterSelect.value = state.filterType;
    }

    const sortSelect = this.container.querySelector('#sort-by-select');
    if (sortSelect && sortSelect.value !== state.sortBy) {
      sortSelect.value = state.sortBy;
    }
  }
}
