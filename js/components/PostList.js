import { PostCard } from './PostCard.js';
import { Skeleton } from './Skeleton.js';
import { CONFIG } from '../config.js';

const svg = (inner) => `<svg class="banner-art" viewBox="0 0 320 180" aria-hidden="true">${inner}</svg>`;

const BANNERS = {
  new: {
    tag: 'Fresh off the press',
    art: svg(`<circle class="s f3 fl" cx="90" cy="100" r="46"/><circle class="s f1 fl" cx="250" cy="55" r="28"/><path class="s f2" d="M180 14 120 100h42l-14 66 66-96h-44z"/>`)
  },
  top: {
    tag: 'What everyone is reading',
    art: svg(`<rect class="s f1" x="70" y="110" width="44" height="56" rx="8"/><rect class="s f2" x="126" y="76" width="44" height="90" rx="8"/><rect class="s f3" x="182" y="40" width="44" height="126" rx="8"/><circle class="s f1 fl" cx="258" cy="46" r="24"/>`)
  },
  jobs: {
    tag: 'Find your next role',
    art: svg(`<path class="s fw" d="M128 64v-14a10 10 0 0 1 10-10h44a10 10 0 0 1 10 10v14z"/><rect class="s f2" x="80" y="64" width="160" height="100" rx="16"/><rect class="s f1" x="80" y="104" width="160" height="14"/><circle class="s f3 fl" cx="268" cy="40" r="20"/>`)
  },
  polls: {
    tag: 'Make your voice count',
    art: svg(`<rect class="s fw" x="60" y="34" width="200" height="30" rx="15"/><rect class="s f1" x="60" y="34" width="150" height="30" rx="15"/><rect class="s fw" x="60" y="78" width="200" height="30" rx="15"/><rect class="s f2" x="60" y="78" width="100" height="30" rx="15"/><rect class="s fw" x="60" y="122" width="200" height="30" rx="15"/><rect class="s f3" x="60" y="122" width="60" height="30" rx="15"/>`)
  },
  ask: {
    tag: 'Questions worth asking',
    art: svg(`<path class="s f2" d="M70 30h180a16 16 0 0 1 16 16v68a16 16 0 0 1-16 16h-96l-40 28v-28h-44a16 16 0 0 1-16-16V46a16 16 0 0 1 16-16z"/><text class="ink" x="160" y="118" text-anchor="middle" font-family="Syne,sans-serif" font-weight="800" font-size="84">?</text><circle class="s f1 fl" cx="272" cy="30" r="14"/>`)
  },
  show: {
    tag: 'Built by the community',
    art: svg(`<rect class="s fw" x="60" y="34" width="200" height="124" rx="14"/><path class="s f2" d="M60 64V48a14 14 0 0 1 14-14h172a14 14 0 0 1 14 14v16z"/><path class="s f1 fl" d="M160 84l12 26 26 12-26 12-12 26-12-26-26-12 26-12z"/>`)
  }
};

const ALIAS = { job: 'jobs', poll: 'polls' };
const bannerKey = (f) => {
  const k = ALIAS[f] || f;
  return BANNERS[k] ? k : 'new';
};

export class PostList {
  constructor({ container, store, actions }) {
    this.container = container;
    this.store = store;
    this.actions = actions;

    this.bannerKey = null;
    this.bannerTitleText = '';
    this.renderLayout();
    this.banner = this.container.querySelector('#feed-banner');
    this.updateBanner('new', '⚡ New Stories', '0 items');
    this.bindEvents();

    this.store.subscribe((state, prev) => {
      this.handleStateChange(state, prev);
    });
  }

  renderLayout() {
    this.container.innerHTML = `
      <section class="feed-section">
        <div class="feed-banner" id="feed-banner" data-feed="new">
          <div class="feed-banner__panel">
            <div class="feed-banner__content">
              <p class="feed-banner__title" id="banner-title"></p>
              <p class="feed-banner__tagline" id="banner-tagline"></p>
              <span class="feed-banner__counter" id="banner-counter"></span>
            </div>
            <div class="feed-banner__art" id="banner-art" aria-hidden="true"></div>
          </div>
        </div>

        <header class="feed-header">
          <div class="feed-title-wrapper">
            <h2 class="feed-title" id="current-feed-title">⚡ New Stories</h2>
            <span class="feed-counter" id="feed-items-count">0 items</span>
          </div>
          <div class="feed-live-notice hidden" id="feed-live-notice">
            <span>✨ New live updates ready</span>
            <button class="btn btn-sm btn-link" id="feed-merge-notice-btn">Merge Now</button>
          </div>
        </header>

        <div class="posts-container" id="posts-container" role="feed">
          ${Skeleton.renderPosts(CONFIG.PAGE_SIZE)}
        </div>

        <div class="feed-footer" id="feed-footer">
          <div class="feed-pagination" id="feed-pagination" aria-label="Pagination">
            <button class="btn btn-outline pagination-btn" id="prev-page-btn" aria-label="Previous page">
              <span class="material-symbols-outlined" aria-hidden="true">chevron_left</span>
              Previous
            </button>
            <span class="pagination-label" id="pagination-label" aria-live="polite">Page 1 of 1</span>
            <button class="btn btn-primary pagination-btn" id="next-page-btn" aria-label="Next page">
              View next page
              <span class="material-symbols-outlined" aria-hidden="true">chevron_right</span>
            </button>
          </div>
          <div class="feed-spinner hidden" id="feed-spinner" aria-label="Loading posts">
            <div class="spinner"></div>
            <span>Loading posts...</span>
          </div>
          <div class="feed-end-notice hidden" id="feed-end-notice">
            You've reached the end of this feed.
          </div>
          <div class="feed-error-box hidden" id="feed-error-box">
            <p id="feed-error-message">Failed to load content.</p>
            <button class="btn btn-outline" id="feed-retry-btn">Try Again</button>
          </div>
        </div>
      </section>
    `;
  }

  updateBanner(key, title, count) {
    const q = (id) => this.banner.querySelector(id);
    this.bannerTitleText = title;
    q('#banner-counter').textContent = count;

    const apply = () => {
      this.banner.dataset.feed = key;
      q('#banner-title').textContent = this.bannerTitleText;
      q('#banner-tagline').textContent = BANNERS[key].tag;
      q('#banner-art').innerHTML = BANNERS[key].art;
    };

    if (key === this.bannerKey) {
      q('#banner-title').textContent = title;
      return;
    }

    const first = this.bannerKey === null;
    this.bannerKey = key;
    if (first) return apply();

    this.banner.classList.add('changing');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = setTimeout(() => {
      apply();
      this.banner.classList.remove('changing');
    }, 180);
  }

  bindEvents() {
    const postsContainer = this.container.querySelector('#posts-container');
    const prevPageBtn = this.container.querySelector('#prev-page-btn');
    const nextPageBtn = this.container.querySelector('#next-page-btn');
    const retryBtn = this.container.querySelector('#feed-retry-btn');
    const mergeNoticeBtn = this.container.querySelector('#feed-merge-notice-btn');

    postsContainer.addEventListener('click', (e) => {
      if (e.target.closest('[data-prevent-modal="true"]')) {
        return;
      }

      const actionTrigger = e.target.closest('[data-action="open-post"]');
      const card = e.target.closest('.post-card');

      if (actionTrigger) {
        const id = actionTrigger.dataset.id;
        if (id) this.actions.openPost(id);
      } else if (card) {
        const id = card.dataset.id;
        if (id) this.actions.openPost(id);
      }
    });

    prevPageBtn.addEventListener('click', () => {
      this.actions.previousPage();
    });

    nextPageBtn.addEventListener('click', () => {
      this.actions.nextPage();
    });

    retryBtn.addEventListener('click', () => {
      const state = this.store.getState();
      if (state.posts.length === 0) {
        this.actions.changeFeed(state.activeFeed);
      } else {
        this.actions.goToPage(state.currentPage);
      }
    });

    mergeNoticeBtn.addEventListener('click', () => {
      this.actions.mergeLiveUpdates();
    });
  }

  handleStateChange(state, prev) {
    const postsContainer = this.container.querySelector('#posts-container');
    const titleEl = this.container.querySelector('#current-feed-title');
    const counterEl = this.container.querySelector('#feed-items-count');
    const prevPageBtn = this.container.querySelector('#prev-page-btn');
    const nextPageBtn = this.container.querySelector('#next-page-btn');
    const paginationLabel = this.container.querySelector('#pagination-label');
    const spinner = this.container.querySelector('#feed-spinner');
    const endNotice = this.container.querySelector('#feed-end-notice');
    const errorBox = this.container.querySelector('#feed-error-box');
    const liveNotice = this.container.querySelector('#feed-live-notice');
    const paginationContainer = this.container.querySelector('#feed-pagination');

    if (state.searchQuery) {
      titleEl.textContent = `🔍 Search: "${state.searchQuery}"`;
      counterEl.textContent = `${state.searchResults?.length || 0} matches`;
    } else {
      const feedConfig = CONFIG.FEEDS[state.activeFeed.toUpperCase()] || CONFIG.FEEDS.NEW;
      titleEl.textContent = feedConfig.label;
      counterEl.textContent = `${state.posts.length} loaded`;
    }

    this.updateBanner(bannerKey(state.activeFeed), titleEl.textContent, counterEl.textContent);

    if (liveNotice) {
      liveNotice.classList.toggle('hidden', state.liveUpdateCount === 0);
    }

    if (state.error) {
      postsContainer.innerHTML = '';
      errorBox.classList.remove('hidden');
      errorBox.querySelector('#feed-error-message').textContent = state.error;
      spinner.classList.add('hidden');
      if (paginationContainer) paginationContainer.classList.add('hidden');
      return;
    } else {
      errorBox.classList.add('hidden');
      if (paginationContainer) paginationContainer.classList.remove('hidden');
    }

    if (state.loading || (state.searchLoading && !state.searchResults)) {
      postsContainer.innerHTML = Skeleton.renderPosts(CONFIG.PAGE_SIZE);
      spinner.classList.remove('hidden');
      endNotice.classList.add('hidden');
      if (paginationContainer) paginationContainer.classList.add('hidden');
      return;
    }

    const sourceList = state.searchQuery ? state.searchResults || [] : state.posts;
    let filteredList = sourceList;

    if (state.filterType !== 'all') {
      filteredList = sourceList.filter((item) => {
        if (state.filterType === 'story') {
          return item.type === 'story' || !item.type;
        }
        return item.type === state.filterType;
      });
    }

    if (filteredList.length === 0) {
      postsContainer.innerHTML = `
        <div class="empty-feed-card">
          <div class="empty-icon">📭</div>
          <h3>No posts found</h3>
          <p>${
            state.searchQuery
              ? `No matches for "${state.searchQuery}". Try different keywords.`
              : 'There are no items currently available in this feed.'
          }</p>
        </div>
      `;
      spinner.classList.add('hidden');
      endNotice.classList.add('hidden');
      if (paginationContainer) paginationContainer.classList.add('hidden');
      return;
    }

    // For pagination, only show current page's posts (15 per page)
    // For search, show all results
    let displayList = filteredList;
    if (!state.searchQuery) {
      const pageSize = state.pageSize || CONFIG.PAGE_SIZE;
      const currentPage = state.currentPage || 1;
      const start = (currentPage - 1) * pageSize;
      const end = start + pageSize;
      displayList = filteredList.slice(start, end);
    }

    postsContainer.innerHTML = displayList
      .map((item, index) => PostCard.render(item, index))
      .join('');

    spinner.classList.add('hidden');

    if (state.searchQuery) {
      endNotice.classList.remove('hidden');
      endNotice.textContent = `Showing all ${filteredList.length} search results.`;
      if (paginationContainer) paginationContainer.classList.add('hidden');
    } else {
      endNotice.classList.add('hidden');
      if (paginationContainer) paginationContainer.classList.remove('hidden');
      
      // Update pagination controls - use feedIds for total pages
      const currentPage = state.currentPage || 1;
      const pageSize = state.pageSize || CONFIG.PAGE_SIZE;
      const totalPages = Math.ceil((state.feedIds?.length || 0) / pageSize) || 1;
      
      // Update totalPages in state if needed
      if (state.totalPages !== totalPages) {
        this.store.setState({ totalPages });
      }
      
      paginationLabel.textContent = `Page ${currentPage} of ${totalPages}`;
      prevPageBtn.disabled = currentPage <= 1;
      nextPageBtn.disabled = currentPage >= totalPages;
      
      // Update button visibility
      prevPageBtn.classList.toggle('hidden', currentPage <= 1);
      nextPageBtn.classList.toggle('hidden', currentPage >= totalPages);
    }
  }
}