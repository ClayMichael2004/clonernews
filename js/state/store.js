/**
 * Reactive Pub/Sub Application Store
 *
 * Provides centralized, predictable state management with subscription hooks
 * for decoupled UI component re-renders.
 */

export class Store {
  constructor(initialState = {}) {
    this.state = {
      activeFeed: 'new',
      feedIds: [],
      posts: [],
      visiblePostIds: new Set(),
      page: 0,
      pageSize: 15,
      currentPage: 1,
      totalPages: 1,
      hasMore: true,
      loading: false,
      loadingMore: false,
      error: null,
      
      // Active post & comment viewer modal state
      activePost: null,
      activePostComments: [],
      commentsLoading: false,
      commentsError: null,

      // Live updates tracking
      liveUpdates: [],
      liveUpdateCount: 0,
      lastLiveCheck: null,
      isLiveDrawerOpen: false,

      // Search & client-side filtering
      searchQuery: '',
      searchResults: null,
      searchLoading: false,
      filterType: 'all', // 'all', 'story', 'job', 'poll'
      sortBy: 'newest',  // 'newest' (default required by spec), 'score', 'comments'

      ...initialState
    };

    this.listeners = new Set();
  }

  /**
   * Returns a snapshot of the current state.
   * @returns {Object}
   */
  getState() {
    return this.state;
  }

  /**
   * Updates state slice and notifies subscribers.
   * @param {Partial<Object>|Function} updater Partial state object or updater function
   */
  setState(updater) {
    const prevState = { ...this.state };
    const nextState = typeof updater === 'function' ? updater(prevState) : updater;

    this.state = {
      ...this.state,
      ...nextState
    };

    this._notify(this.state, prevState);
  }

  /**
   * Subscribes a listener callback to state changes.
   * @param {(state: Object, prevState: Object) => void} listener
   * @returns {() => void} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  _notify(state, prevState) {
    for (const listener of this.listeners) {
      try {
        listener(state, prevState);
      } catch (err) {
        console.error('[Store] Error in state listener:', err);
      }
    }
  }
}
