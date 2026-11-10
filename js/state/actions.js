/**
 * Application Actions
 *
 * Encapsulates asynchronous workflows, network requests, and deterministic
 * state transformations.
 */

import { sortByNewest } from '../utils/time.js';

export function createActions(store, hnClient, notificationService) {
  return {
    /**
     * Changes active feed and loads initial batch.
     * @param {string} feedId
     */
    async changeFeed(feedId) {
      const state = store.getState();
      if (state.activeFeed === feedId && state.posts.length > 0 && !state.searchQuery) {
        return;
      }

      store.setState({
        activeFeed: feedId,
        loading: true,
        error: null,
        posts: [],
        visiblePostIds: new Set(),
        page: 0,
        hasMore: true,
        searchQuery: '',
        searchResults: null
      });

      try {
        const feedIds = await hnClient.getFeedIds(feedId);

        if (!feedIds || feedIds.length === 0) {
          store.setState({
            feedIds: [],
            posts: [],
            loading: false,
            hasMore: false
          });
          return;
        }

        const pageSize = store.getState().pageSize;
        const firstBatchIds = feedIds.slice(0, pageSize);
        const rawItems = await hnClient.getItems(firstBatchIds);

        // Filter valid posts and enrich polls if applicable
        const enrichedItems = await Promise.all(
          rawItems.filter(Boolean).map(async (item) => {
            if (item.type === 'poll') {
              return await hnClient.getPollDetails(item);
            }
            return item;
          })
        );

        // ALWAYS enforce newest to oldest ordering
        const sortedItems = sortByNewest(enrichedItems);
        const visibleSet = new Set(sortedItems.map((p) => p.id));

        store.setState({
          feedIds,
          posts: sortedItems,
          visiblePostIds: visibleSet,
          page: 1,
          hasMore: feedIds.length > pageSize,
          loading: false
        });
      } catch (err) {
        console.error('[Actions] changeFeed failed:', err);
        store.setState({
          loading: false,
          error: 'Unable to load stories. Please check your connection and retry.'
        });
      }
    },

    /**
     * Progressive loading: fetches next batch of posts.
     */
    async loadMorePosts() {
      const state = store.getState();
      if (state.loadingMore || state.loading || !state.hasMore) {
        return;
      }

      store.setState({ loadingMore: true });

      try {
        const { feedIds, page, pageSize, posts, visiblePostIds } = store.getState();
        const start = page * pageSize;
        const nextBatchIds = feedIds.slice(start, start + pageSize);

        if (nextBatchIds.length === 0) {
          store.setState({ hasMore: false, loadingMore: false });
          return;
        }

        const rawItems = await hnClient.getItems(nextBatchIds);

        const enrichedItems = await Promise.all(
          rawItems.filter(Boolean).map(async (item) => {
            if (item.type === 'poll') {
              return await hnClient.getPollDetails(item);
            }
            return item;
          })
        );

        // Filter duplicates and append
        const newPosts = [];
        const updatedVisibleSet = new Set(visiblePostIds);

        for (const item of enrichedItems) {
          if (!updatedVisibleSet.has(item.id)) {
            updatedVisibleSet.add(item.id);
            newPosts.push(item);
          }
        }

        const combined = [...posts, ...newPosts];

        // Ensure overall feed remains ordered newest to oldest
        if (state.sortBy === 'newest') {
          sortByNewest(combined, false);
        }

        store.setState({
          posts: combined,
          visiblePostIds: updatedVisibleSet,
          page: page + 1,
          hasMore: (page + 1) * pageSize < feedIds.length,
          loadingMore: false
        });
      } catch (err) {
        console.error('[Actions] loadMorePosts failed:', err);
        store.setState({ loadingMore: false });
        notificationService?.showToast({
          message: 'Failed to load more posts. Please retry.',
          type: 'error'
        });
      }
    },

    /**
     * Opens post detail modal and loads full hierarchical comment tree.
     * @param {number|string} postId
     */
    async openPost(postId) {
      store.setState({
        commentsLoading: true,
        commentsError: null,
        activePostComments: []
      });

      try {
        let post = store.getState().posts.find((p) => p.id === Number(postId));

        if (!post) {
          post = await hnClient.getItem(postId);
        }

        if (post && post.type === 'poll' && !post.pollOptions) {
          post = await hnClient.getPollDetails(post);
        }

        store.setState({ activePost: post });

        if (!post) {
          store.setState({
            commentsLoading: false,
            commentsError: 'Post could not be found.'
          });
          return;
        }

        // Fetch comments and ensure strictly ordered newest to oldest
        const comments = await hnClient.getCommentTree(post);

        store.setState({
          activePostComments: comments,
          commentsLoading: false
        });
      } catch (err) {
        console.error('[Actions] openPost failed:', err);
        store.setState({
          commentsLoading: false,
          commentsError: 'Could not load comments thread.'
        });
      }
    },

    /**
     * Closes the active post detail modal.
     */
    closePost() {
      store.setState({
        activePost: null,
        activePostComments: [],
        commentsLoading: false,
        commentsError: null
      });
    },

    /**
     * Merges pending live update items into the main feed.
     */
    mergeLiveUpdates() {
      const state = store.getState();
      if (!state.liveUpdates || state.liveUpdates.length === 0) return;

      const currentPosts = [...state.posts];
      const visibleSet = new Set(state.visiblePostIds);
      let newCount = 0;

      for (const item of state.liveUpdates) {
        if (!visibleSet.has(item.id)) {
          visibleSet.add(item.id);
          currentPosts.unshift(item);
          newCount++;
        } else {
          // Update existing item in place
          const index = currentPosts.findIndex((p) => p.id === item.id);
          if (index !== -1) {
            currentPosts[index] = item;
          }
        }
      }

      // Re-sort feed strictly newest to oldest
      if (state.sortBy === 'newest') {
        sortByNewest(currentPosts, false);
      }

      store.setState({
        posts: currentPosts,
        visiblePostIds: visibleSet,
        liveUpdates: [],
        liveUpdateCount: 0
      });

      notificationService?.showToast({
        message: `Merged ${newCount} new/updated story updates into your feed!`,
        type: 'success'
      });
    },

    /**
     * Performs search against Algolia index.
     * @param {string} query
     */
    async search(query) {
      const trimmed = query ? query.trim() : '';

      if (!trimmed) {
        store.setState({
          searchQuery: '',
          searchResults: null,
          searchLoading: false
        });
        return;
      }

      store.setState({
        searchQuery: trimmed,
        searchLoading: true
      });

      try {
        const results = await hnClient.search(trimmed);
        const sortedResults = sortByNewest(results);

        store.setState({
          searchResults: sortedResults,
          searchLoading: false
        });
      } catch (err) {
        console.error('[Actions] search failed:', err);
        store.setState({
          searchLoading: false,
          searchResults: []
        });
      }
    },

    /**
     * Sets post type filter ('all', 'story', 'job', 'poll').
     * @param {string} filterType
     */
    setFilterType(filterType) {
      store.setState({ filterType });
    },

    /**
     * Sets sorting criteria ('newest', 'score', 'comments').
     * @param {string} sortBy
     */
    setSortBy(sortBy) {
      const state = store.getState();
      const sorted = [...state.posts];

      if (sortBy === 'newest') {
        sortByNewest(sorted, false);
      } else if (sortBy === 'score') {
        sorted.sort((a, b) => (b.score || 0) - (a.score || 0));
      } else if (sortBy === 'comments') {
        sorted.sort((a, b) => (b.descendants || 0) - (a.descendants || 0));
      }

      store.setState({
        sortBy,
        posts: sorted
      });
    },

    /**
     * Toggles live updates slide-over drawer.
     * @param {boolean} isOpen
     */
    setLiveDrawerOpen(isOpen) {
      store.setState({ isLiveDrawerOpen: isOpen });
    }
  };
}
