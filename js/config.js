/**
 * ClonerNews Configuration & Constants
 */
export const CONFIG = {
  // Official Hacker News Firebase REST API
  HN_API_BASE: 'https://hacker-news.firebaseio.com/v0',
  
  // Algolia HN Search API (used as auxiliary index for real polls & query search)
  ALGOLIA_API_BASE: 'https://hn.algolia.com/api/v1',

  // Pagination & progressive loading
  PAGE_SIZE: 15,

  // Live data update polling cadence (minimum 5 seconds as requested)
  LIVE_POLL_INTERVAL_MS: 5000,

  // Concurrency limit for batch fetching item details
  MAX_CONCURRENT_REQUESTS: 6,

  // LRU In-memory Cache capacity
  LRU_CACHE_CAPACITY: 500,

  // Network retry settings
  MAX_RETRIES: 3,
  INITIAL_RETRY_DELAY_MS: 800,
  REQUEST_TIMEOUT_MS: 9000,

  // Performance throttling & debouncing thresholds
  SCROLL_THROTTLE_MS: 150,
  SEARCH_DEBOUNCE_MS: 250,

  // Feed types configuration
  FEEDS: {
    NEW: { id: 'new', label: '⚡ New Stories', endpoint: '/newstories.json' },
    TOP: { id: 'top', label: '🔥 Top Stories', endpoint: '/topstories.json' },
    BEST: { id: 'best', label: '⭐ Best Stories', endpoint: '/beststories.json' },
    JOBS: { id: 'jobs', label: '💼 Tech Jobs', endpoint: '/jobstories.json' },
    POLLS: { id: 'polls', label: '📊 Community Polls', endpoint: null }, // Handled via hybrid loader
    ASK: { id: 'ask', label: '❓ Ask HN', endpoint: '/askstories.json' },
    SHOW: { id: 'show', label: '💡 Show HN', endpoint: '/showstories.json' }
  }
};
