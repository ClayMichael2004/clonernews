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
      <section class="feed-section" data-feed="new">
        <!-- Hero Banner -->
        <div class="feed-banner" id="feed-banner" data-feed="new" role="region" aria-label="Feed banner">
          <div class="feed-banner__inner">
            <div class="feed-banner__content">
              <h1 class="feed-banner__title" id="banner-title">⚡ New Stories</h1>
              <p class="feed-banner__tagline" id="banner-tagline">Fresh off the press</p>
              <span class="feed-banner__counter" id="banner-counter">0 loaded</span>
            </div>
            <div class="feed-banner__art" id="banner-art" aria-hidden="true">
              ${this.renderBannerArt('new')}
            </div>
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

  /**
   * Render decorative SVG art for the banner based on feed type
   * @param {string} feedId
   * @returns {string} SVG HTML
   */
  renderBannerArt(feedId) {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    
    if (isLight) {
      // Neo-brutalist flat shapes for light theme
      const shapes = this.getLightShapes(feedId);
      return `
        <svg class="feed-banner__svg" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
          ${shapes}
        </svg>
      `;
    }
    
    // Dark theme: gradient mesh blobs
    const blobs = this.getDarkBlobs(feedId);
    return `
      <svg class="feed-banner__svg" viewBox="0 0 320 180" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="blob-blur" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="15" result="blur"/>
            <feColorMatrix in="blur" mode="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"/>
          </filter>
        </defs>
        ${blobs}
      </svg>
    `;
  }

  /**
   * Get neo-brutalist shapes for light theme
   * @param {string} feedId
   * @returns {string} SVG shape elements
   */
  getLightShapes(feedId) {
    const configs = {
      new: [
        { type: 'rect', x: 20, y: 20, w: 80, h: 80, r: 12, color: 'var(--banner-shape-1)', class: 'feed-banner__shape' },
        { type: 'circle', cx: 240, cy: 40, r: 35, color: 'var(--banner-shape-2)', class: 'feed-banner__shape feed-banner__shape--circle' },
        { type: 'rect', x: 260, y: 100, w: 50, h: 50, r: 12, color: 'var(--banner-shape-3)', class: 'feed-banner__shape', style: 'transform: rotate(-12deg); transform-origin: center;' },
        { type: 'path', d: 'M40 120 Q60 100 80 120 Q100 140 80 160 Q60 180 40 160 Q20 140 40 120', color: 'var(--banner-shape-4)', class: 'feed-banner__shape feed-banner__shape--blob' },
        { type: 'rect', x: 140, y: 130, w: 60, h: 30, r: 8, color: 'var(--banner-shape-5)', class: 'feed-banner__shape' },
      ],
      top: [
        { type: 'circle', cx: 60, cy: 60, r: 40, color: 'var(--banner-shape-1)', class: 'feed-banner__shape feed-banner__shape--circle' },
        { type: 'rect', x: 200, y: 10, w: 90, h: 90, r: 16, color: 'var(--banner-shape-2)', class: 'feed-banner__shape', style: 'transform: rotate(15deg); transform-origin: center;' },
        { type: 'path', d: 'M280 140 Q300 120 320 140 Q300 160 280 140', color: 'var(--banner-shape-3)', class: 'feed-banner__shape feed-banner__shape--blob' },
        { type: 'rect', x: 40, y: 120, w: 70, h: 40, r: 10, color: 'var(--banner-shape-4)', class: 'feed-banner__shape' },
        { type: 'circle', cx: 160, cy: 150, r: 25, color: 'var(--banner-shape-5)', class: 'feed-banner__shape feed-banner__shape--circle' },
      ],
      jobs: [
        { type: 'rect', x: 30, y: 30, w: 100, h: 60, r: 12, color: 'var(--banner-shape-1)', class: 'feed-banner__shape' },
        { type: 'circle', cx: 280, cy: 50, r: 45, color: 'var(--banner-shape-2)', class: 'feed-banner__shape feed-banner__shape--circle' },
        { type: 'path', d: 'M50 130 L90 100 L130 130 L110 160 L70 160 Z', color: 'var(--banner-shape-3)', class: 'feed-banner__shape feed-banner__shape--blob' },
        { type: 'rect', x: 220, y: 110, w: 40, h: 60, r: 8, color: 'var(--banner-shape-4)', class: 'feed-banner__shape', style: 'transform: rotate(-8deg); transform-origin: center;' },
        { type: 'circle', cx: 160, cy: 150, r: 20, color: 'var(--banner-shape-5)', class: 'feed-banner__shape feed-banner__shape--circle' },
      ],
      polls: [
        { type: 'circle', cx: 80, cy: 70, r: 50, color: 'var(--banner-shape-1)', class: 'feed-banner__shape feed-banner__shape--circle' },
        { type: 'rect', x: 180, y: 20, w: 100, h: 100, r: 20, color: 'var(--banner-shape-2)', class: 'feed-banner__shape', style: 'transform: rotate(10deg); transform-origin: center;' },
        { type: 'path', d: 'M20 140 Q50 110 80 140 Q110 170 80 170 Q50 140 20 140', color: 'var(--banner-shape-3)', class: 'feed-banner__shape feed-banner__shape--blob' },
        { type: 'rect', x: 260, y: 100, w: 50, h: 50, r: 12, color: 'var(--banner-shape-4)', class: 'feed-banner__shape' },
        { type: 'circle', cx: 140, cy: 140, r: 30, color: 'var(--banner-shape-5)', class: 'feed-banner__shape feed-banner__shape--circle' },
      ],
      ask: [
        { type: 'path', d: 'M60 40 Q80 20 100 40 Q120 60 100 80 Q80 100 60 80 Q40 60 60 40', color: 'var(--banner-shape-1)', class: 'feed-banner__shape feed-banner__shape--blob' },
        { type: 'rect', x: 220, y: 30, w: 80, h: 80, r: 16, color: 'var(--banner-shape-2)', class: 'feed-banner__shape', style: 'transform: rotate(-15deg); transform-origin: center;' },
        { type: 'circle', cx: 40, cy: 150, r: 35, color: 'var(--banner-shape-3)', class: 'feed-banner__shape feed-banner__shape--circle' },
        { type: 'rect', x: 120, y: 130, w: 70, h: 35, r: 8, color: 'var(--banner-shape-4)', class: 'feed-banner__shape' },
        { type: 'path', d: 'M280 130 Q300 110 320 130 Q300 150 280 150 Q260 130 280 130', color: 'var(--banner-shape-5)', class: 'feed-banner__shape feed-banner__shape--blob' },
      ],
      show: [
        { type: 'rect', x: 40, y: 40, w: 70, h: 70, r: 14, color: 'var(--banner-shape-1)', class: 'feed-banner__shape', style: 'transform: rotate(8deg); transform-origin: center;' },
        { type: 'circle', cx: 260, cy: 60, r: 40, color: 'var(--banner-shape-2)', class: 'feed-banner__shape feed-banner__shape--circle' },
        { type: 'path', d: 'M30 120 L70 90 L110 120 L90 150 L50 150 Z', color: 'var(--banner-shape-3)', class: 'feed-banner__shape feed-banner__shape--blob' },
        { type: 'rect', x: 180, y: 110, w: 90, h: 45, r: 10, color: 'var(--banner-shape-4)', class: 'feed-banner__shape' },
        { type: 'circle', cx: 140, cy: 140, r: 25, color: 'var(--banner-shape-5)', class: 'feed-banner__shape feed-banner__shape--circle' },
      ],
    };
    
    const shapes = configs[feedId] || configs.new;
    return shapes.map(s => {
      const fill = s.color;
      const common = `fill="${fill}" stroke="#141622" stroke-width="3" class="${s.class || ''}"`;
      if (s.type === 'rect') {
        const style = s.style ? ` style="${s.style}"` : '';
        return `<rect x="${s.x}" y="${s.y}" width="${s.w}" height="${s.h}" rx="${s.r}" ${common}${style}/>`;
      }
      if (s.type === 'circle') {
        return `<circle cx="${s.cx}" cy="${s.cy}" r="${s.r}" ${common}/>`;
      }
      if (s.type === 'path') {
        return `<path d="${s.d}" ${common}/>`;
      }
      return '';
    }).join('');
  }

  /**
   * Get gradient blobs for dark theme
   * @param {string} feedId
   * @returns {string} SVG blob elements
   */
  getDarkBlobs(feedId) {
    const configs = {
      new: [
        { cx: 60, cy: 60, r: 80, color: '#8ed5ff', opacity: 0.4 },
        { cx: 260, cy: 40, r: 100, color: '#38bdf8', opacity: 0.35 },
        { cx: 280, cy: 140, r: 60, color: '#0ea5e9', opacity: 0.3 },
        { cx: 40, cy: 130, r: 90, color: '#06b6d4', opacity: 0.25 },
        { cx: 160, cy: 150, r: 50, color: '#0ea5e9', opacity: 0.3 },
      ],
      top: [
        { cx: 60, cy: 60, r: 90, color: '#ffd23f', opacity: 0.4 },
        { cx: 240, cy: 30, r: 110, color: '#ff7eb6', opacity: 0.35 },
        { cx: 300, cy: 140, r: 70, color: '#ec4899', opacity: 0.3 },
        { cx: 50, cy: 130, r: 80, color: '#f472b6', opacity: 0.25 },
        { cx: 160, cy: 150, r: 50, color: '#fda4af', opacity: 0.3 },
      ],
      jobs: [
        { cx: 70, cy: 50, r: 100, color: '#3ddc97', opacity: 0.4 },
        { cx: 270, cy: 40, r: 120, color: '#14b8a6', opacity: 0.35 },
        { cx: 60, cy: 140, r: 80, color: '#0d9488', opacity: 0.3 },
        { cx: 240, cy: 120, r: 60, color: '#2dd4bf', opacity: 0.25 },
        { cx: 160, cy: 150, r: 50, color: '#5eead4', opacity: 0.3 },
      ],
      polls: [
        { cx: 80, cy: 70, r: 100, color: '#b69cff', opacity: 0.4 },
        { cx: 260, cy: 50, r: 110, color: '#ff7eb6', opacity: 0.35 },
        { cx: 40, cy: 140, r: 90, color: '#d946ef', opacity: 0.3 },
        { cx: 280, cy: 120, r: 70, color: '#e879f9', opacity: 0.25 },
        { cx: 160, cy: 150, r: 60, color: '#f0abfc', opacity: 0.3 },
      ],
      ask: [
        { cx: 60, cy: 50, r: 90, color: '#ff7eb6', opacity: 0.4 },
        { cx: 250, cy: 40, r: 110, color: '#c084fc', opacity: 0.35 },
        { cx: 50, cy: 140, r: 80, color: '#a855f7', opacity: 0.3 },
        { cx: 270, cy: 130, r: 70, color: '#d946ef', opacity: 0.25 },
        { cx: 160, cy: 150, r: 50, color: '#e879f9', opacity: 0.3 },
      ],
      show: [
        { cx: 50, cy: 50, r: 80, color: '#ffd23f', opacity: 0.4 },
        { cx: 260, cy: 60, r: 100, color: '#ff6600', opacity: 0.35 },
        { cx: 40, cy: 130, r: 90, color: '#ea580c', opacity: 0.3 },
        { cx: 240, cy: 120, r: 80, color: '#fb923c', opacity: 0.25 },
        { cx: 160, cy: 150, r: 50, color: '#fdba74', opacity: 0.3 },
      ],
    };
    
    const blobs = configs[feedId] || configs.new;
    return blobs.map(b => 
      `<circle cx="${b.cx}" cy="${b.cy}" r="${b.r}" fill="${b.color}" opacity="${b.opacity}" filter="url(#blob-blur)"/>`
    ).join('');
  }

  /**
   * Update banner content with new feed data
   * @param {HTMLElement} banner 
   * @param {HTMLElement} bannerTitle 
   * @param {HTMLElement} bannerTagline 
   * @param {HTMLElement} bannerCounter 
   * @param {HTMLElement} bannerArt 
   * @param {string} feedKey 
   * @param {string} displayTitle 
   * @param {string} displayCount 
   * @param {string} tagline 
   */
  updateBannerContent(banner, bannerTitle, bannerTagline, bannerCounter, bannerArt, feedKey, displayTitle, displayCount, tagline) {
    if (!banner) return;
    
    // Update text content
    if (bannerTitle) bannerTitle.textContent = displayTitle;
    if (bannerTagline) bannerTagline.textContent = tagline || '';
    if (bannerCounter) bannerCounter.textContent = displayCount;
    
    // Update art if feed changed
    if (bannerArt) {
      bannerArt.innerHTML = this.renderBannerArt(feedKey);
    }
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
    const feedSection = this.container.querySelector('.feed-section');
    const banner = this.container.querySelector('#feed-banner');
    const bannerTitle = this.container.querySelector('#banner-title');
    const bannerTagline = this.container.querySelector('#banner-tagline');
    const bannerCounter = this.container.querySelector('#banner-counter');
    const bannerArt = this.container.querySelector('#banner-art');

    let feedKey = state.activeFeed;
    let displayTitle = '';
    let displayCount = '';

    if (state.searchQuery) {
      feedKey = 'search';
      displayTitle = `🔍 Search: "${state.searchQuery}"`;
      displayCount = `${state.searchResults?.length || 0} matches`;
    } else {
      const feedConfig = CONFIG.FEEDS[state.activeFeed.toUpperCase()] || CONFIG.FEEDS.NEW;
      feedKey = state.activeFeed;
      displayTitle = feedConfig.label;
      displayCount = `${state.posts.length} loaded`;
    }

    titleEl.textContent = displayTitle;
    counterEl.textContent = displayCount;

    // Update banner with crossfade animation
    if (banner && feedSection) {
      const taglines = {
        new: 'Fresh off the press',
        top: "What everyone is reading",
        jobs: 'Find your next role',
        polls: 'Make your voice count',
        ask: 'Questions worth asking',
        show: 'Built by the community',
        search: 'Search results',
      };

      const isChanging = prev && prev.activeFeed !== state.activeFeed && !state.searchQuery && !prev.searchQuery;
      
      if (isChanging) {
        banner.classList.add('changing');
        // Wait for animation to start, then update content
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.updateBannerContent(banner, bannerTitle, bannerTagline, bannerCounter, bannerArt, feedKey, displayTitle, displayCount, taglines[feedKey]);
            feedSection.dataset.feed = feedKey;
            banner.dataset.feed = feedKey;
            // Remove changing class after transition
            setTimeout(() => banner.classList.remove('changing'), 300);
          });
        });
      } else {
        this.updateBannerContent(banner, bannerTitle, bannerTagline, bannerCounter, bannerArt, feedKey, displayTitle, displayCount, taglines[feedKey]);
        feedSection.dataset.feed = feedKey;
        banner.dataset.feed = feedKey;
      }
    }

    if (liveNotice) {
      liveNotice.classList.toggle('hidden', state.liveUpdateCount === 0);
    }

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

    if (state.loading || (state.searchLoading && !state.searchResults)) {
      postsContainer.innerHTML = Skeleton.renderPosts(CONFIG.PAGE_SIZE);
      loadMoreBtn.classList.add('hidden');
      spinner.classList.remove('hidden');
      endNotice.classList.add('hidden');
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
      loadMoreBtn.classList.add('hidden');
      spinner.classList.add('hidden');
      endNotice.classList.add('hidden');
      return;
    }

    postsContainer.innerHTML = filteredList
      .map((item, index) => PostCard.render(item, index))
      .join('');

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