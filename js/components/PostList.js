/**
 * Post List Component
 *
 * Manages rendering the feed of stories, jobs, and polls, progressive loading
 * via IntersectionObserver & throttled scroll events, and "Load More" controls.
 */

import { PostCard } from './PostCard.js';
import { Skeleton } from './Skeleton.js';
import { throttle } from '../utils/throttle.js';
import { CONFIG } from '../config.js';

export class PostList {
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

    this.observer = null;
    this.renderLayout();
    this.setupInfiniteScroll();
    this.bindEvents();

    this.store.subscribe((state, prev) => {
      this.handleStateChange(state, prev);
    });
  }

  renderLayout() {
    this.container.innerHTML = `
      <section class="feed-section">
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
          <button class="btn btn-primary load-more-btn hidden" id="load-more-btn">
            Load More Content
          </button>
          <div class="feed-spinner hidden" id="feed-spinner" aria-label="Loading more posts">
            <div class="spinner"></div>
            <span>Loading older posts...</span>
          </div>
          <div class="feed-end-notice hidden" id="feed-end-notice">
            You've reached the end of this feed.
          </div>
          <div class="feed-error-box hidden" id="feed-error-box">
            <p id="feed-error-message">Failed to load content.</p>
            <button class="btn btn-outline" id="feed-retry-btn">Try Again</button>
          </div>
        </div>

        <!-- Intersection Observer Target Sentinel -->
        <div id="scroll-sentinel" class="scroll-sentinel" aria-hidden="true"></div>
      </section>
    `;
  }

  setupInfiniteScroll() {
    const sentinel = this.container.querySelector('#scroll-sentinel');
    if (!sentinel) return;

    // IntersectionObserver for modern high-performance progressive loading
    if ('IntersectionObserver' in window) {
      this.observer = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (entry.isIntersecting) {
            const state = this.store.getState();
            if (!state.loading && !state.loadingMore && state.hasMore && !state.searchQuery) {
              this.actions.loadMorePosts();
            }
          }
        },
        { rootMargin: '300px' }
      );
      this.observer.observe(sentinel);
    }

    // Throttled scroll listener fallback
    const throttledScroll = throttle(() => {
      const state = this.store.getState();
      if (state.loading || state.loadingMore || !state.hasMore || state.searchQuery) {
        return;
      }

      const scrollY = window.scrollY || window.pageYOffset;
      const windowHeight = window.innerHeight;
      const docHeight = document.documentElement.scrollHeight;

      // When within 400px of bottom
      if (scrollY + windowHeight >= docHeight - 400) {
        this.actions.loadMorePosts();
      }
    }, CONFIG.SCROLL_THROTTLE_MS);

    window.addEventListener('scroll', throttledScroll, { passive: true });
  }

  bindEvents() {
    const postsContainer = this.container.querySelector('#posts-container');
    const loadMoreBtn = this.container.querySelector('#load-more-btn');
    const retryBtn = this.container.querySelector('#feed-retry-btn');
    const mergeNoticeBtn = this.container.querySelector('#feed-merge-notice-btn');

    // Event delegation on post cards
    postsContainer.addEventListener('click', (e) => {
      // Don't intercept direct external links
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

    // Explicit Load More button click
    loadMoreBtn.addEventListener('click', () => {
      this.actions.loadMorePosts();
    });

    // Retry button click
    retryBtn.addEventListener('click', () => {
      const state = this.store.getState();
      if (state.posts.length === 0) {
        this.actions.changeFeed(state.activeFeed);
      } else {
        this.actions.loadMorePosts();
      }
    });

    // Merge live updates notice banner click
    mergeNoticeBtn.addEventListener('click', () => {
      this.actions.mergeLiveUpdates();
    });
  }

  handleStateChange(state, prev) {
    const postsContainer = this.container.querySelector('#posts-container');
    const titleEl = this.container.querySelector('#current-feed-title');
    const counterEl = this.container.querySelector('#feed-items-count');
    const loadMoreBtn = this.container.querySelector('#load-more-btn');
    const spinner = this.container.querySelector('#feed-spinner');
    const endNotice = this.container.querySelector('#feed-end-notice');
    const errorBox = this.container.querySelector('#feed-error-box');
    const liveNotice = this.container.querySelector('#feed-live-notice');

    // Title & count
    if (state.searchQuery) {
      titleEl.textContent = `🔍 Search: "${state.searchQuery}"`;
      counterEl.textContent = `${state.searchResults?.length || 0} matches`;
    } else {
      const feedConfig = CONFIG.FEEDS[state.activeFeed.toUpperCase()] || CONFIG.FEEDS.NEW;
      titleEl.textContent = feedConfig.label;
      counterEl.textContent = `${state.posts.length} loaded`;
    }

    // Live update floating notice
    if (liveNotice) {
      liveNotice.classList.toggle('hidden', state.liveUpdateCount === 0);
    }

    // Error state
    if (state.error) {
      postsContainer.innerHTML = '';
      errorBox.classList.remove('hidden');
      errorBox.querySelector('#feed-error-message').textContent = state.error;
      loadMoreBtn.classList.add('hidden');
      spinner.classList.add('hidden');
      return;
    } else {
      errorBox.classList.add('hidden');
    }

    // Initial Loading State
    if (state.loading || (state.searchLoading && !state.searchResults)) {
      postsContainer.innerHTML = Skeleton.renderPosts(CONFIG.PAGE_SIZE);
      loadMoreBtn.classList.add('hidden');
      spinner.classList.remove('hidden');
      endNotice.classList.add('hidden');
      return;
    }

    // Filter displayed posts by type
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

    // Empty state
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
      loadMoreBtn.classList.add('hidden');
      spinner.classList.add('hidden');
      endNotice.classList.add('hidden');
      return;
    }

    // Render Posts
    postsContainer.innerHTML = filteredList
      .map((item, index) => PostCard.render(item, index))
      .join('');

    // Progressive loading indicators
    spinner.classList.toggle('hidden', !state.loadingMore);
    
    if (state.searchQuery) {
      loadMoreBtn.classList.add('hidden');
      endNotice.classList.remove('hidden');
      endNotice.textContent = `Showing all ${filteredList.length} search results.`;
    } else {
      loadMoreBtn.classList.toggle('hidden', !state.hasMore || state.loadingMore);
      endNotice.classList.toggle('hidden', state.hasMore);
      if (!state.hasMore) {
        endNotice.textContent = `All ${state.posts.length} posts loaded from this feed.`;
      }
    }
  }
}
