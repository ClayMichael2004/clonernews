/**
 * Header Component
 *
 * Renders enterprise navigation, feed selectors, search input, theme switcher,
 * live update indicators, and sorting/filtering controls.
 */

import { CONFIG } from '../config.js';
import { debounce } from '../utils/debounce.js';
import { toggleTheme, getCurrentTheme } from '../theme.js';

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
    const currentTheme = getCurrentTheme();
    const isLight = currentTheme === 'light';

    this.container.innerHTML = `
      <div class="header-inner">
        <div class="header-brand">
          <div class="brand-logo" aria-label="Logo">
            <span class="logo-y">Y</span>
          </div>
          <div class="brand-titles">
            <h1 class="brand-name">ClonerNews</h1>
            <span class="brand-subtitle">Enterprise Hacker News Reader</span>
          </div>
        </div>

        <nav class="feed-nav" aria-label="News Feeds">
          <button class="nav-tab active" data-feed="new">New</button>
          <button class="nav-tab" data-feed="top">Top</button>
          <button class="nav-tab" data-feed="jobs">Jobs</button>
          <button class="nav-tab" data-feed="polls">Polls</button>
          <button class="nav-tab" data-feed="ask">Ask HN</button>
          <button class="nav-tab" data-feed="show">Show HN</button>
        </nav>

        <div class="header-actions">
          <div class="search-box">
            <svg class="search-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <input
              type="search"
              id="search-input"
              class="search-input"
              placeholder="Search stories..."
              aria-label="Search stories, jobs, and discussions"
            />
            <button id="search-clear-btn" class="search-clear-btn hidden" aria-label="Clear search">&times;</button>
          </div>

          <div class="header-controls">
            <select id="filter-type-select" class="control-select" aria-label="Filter post type">
              <option value="all">Filter: All</option>
              <option value="story">Stories</option>
              <option value="job">Jobs</option>
              <option value="poll">Polls</option>
            </select>

            <select id="sort-by-select" class="control-select" aria-label="Sort order">
              <option value="newest" selected>Order: Newest</option>
              <option value="score">Order: Score</option>
              <option value="comments">Order: Comments</option>
            </select>

            <button id="theme-toggle-btn" class="theme-toggle-btn" title="Toggle dark/light theme" aria-label="Toggle theme">
              <svg class="theme-icon-svg icon-sun ${isLight ? '' : 'hidden'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="5"></circle>
                <line x1="12" y1="1" x2="12" y2="3"></line>
                <line x1="12" y1="21" x2="12" y2="23"></line>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                <line x1="1" y1="12" x2="3" y2="12"></line>
                <line x1="21" y1="12" x2="23" y2="12"></line>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
              </svg>
              <svg class="theme-icon-svg icon-moon ${isLight ? 'hidden' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
              </svg>
            </button>

            <button id="live-drawer-toggle-btn" class="live-status-btn" title="Live Data Stream (5s cadence)">
              <span class="live-pulse-dot" aria-hidden="true"></span>
              <span class="live-label">LIVE</span>
              <span id="live-badge-count" class="live-badge-count hidden">0</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    // Nav tabs
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

    // Theme toggle
    const themeBtn = this.container.querySelector('#theme-toggle-btn');
    themeBtn.addEventListener('click', () => {
      const nextTheme = toggleTheme();
      const isLight = nextTheme === 'light';
      const sunIcon = themeBtn.querySelector('.icon-sun');
      const moonIcon = themeBtn.querySelector('.icon-moon');
      if (sunIcon) sunIcon.classList.toggle('hidden', !isLight);
      if (moonIcon) moonIcon.classList.toggle('hidden', isLight);
    });

    // Live drawer toggle
    const liveBtn = this.container.querySelector('#live-drawer-toggle-btn');
    liveBtn.addEventListener('click', () => {
      const isOpen = this.store.getState().isLiveDrawerOpen;
      this.actions.setLiveDrawerOpen(!isOpen);
    });
  }

  updateDynamicElements(state) {
    const tabs = this.container.querySelectorAll('.nav-tab');
    tabs.forEach((tab) => {
      tab.classList.toggle('active', tab.dataset.feed === state.activeFeed && !state.searchQuery);
    });

    const badge = this.container.querySelector('#live-badge-count');
    if (badge) {
      if (state.liveUpdateCount > 0) {
        badge.textContent = state.liveUpdateCount > 99 ? '99+' : state.liveUpdateCount;
        badge.classList.remove('hidden');
      } else {
        badge.classList.add('hidden');
      }
    }

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
