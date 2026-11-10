/**
 * ClonerNews Application Entry Point
 *
 * Bootstraps architectural layers: HNClient, Store, Services, Actions,
 * and Components, setting up URL hash routing and live updates.
 */

import { CONFIG } from './config.js';
import { HNClient } from './api/hnClient.js';
import { Store } from './state/store.js';
import { createActions } from './state/actions.js';
import { NotificationService } from './services/notificationService.js';
import { LiveUpdateService } from './services/liveUpdateService.js';
import { Header } from './components/Header.js';
import { PostList } from './components/PostList.js';
import { PostModal } from './components/PostModal.js';
import { LiveDrawer } from './components/LiveDrawer.js';
import { initTheme } from './theme.js';

class App {
  constructor() {
    this.hnClient = new HNClient();
    this.store = new Store();
    this.notificationService = new NotificationService();
    this.actions = createActions(this.store, this.hnClient, this.notificationService);

    this.liveUpdateService = new LiveUpdateService({
      hnClient: this.hnClient,
      store: this.store,
      notificationService: this.notificationService,
      onMerge: () => this.actions.mergeLiveUpdates()
    });
  }

  /**
   * Initializes the application and mounts DOM elements.
   */
  async init() {
    console.log('Initializing ClonerNews...');

    // Initialize Theme (Dark/Light/System)
    initTheme();

    // Mount toast notification service container
    const toastContainer = document.getElementById('toast-container');
    if (toastContainer) {
      this.notificationService.mount(toastContainer);
    }

    // Mount Header component
    const headerEl = document.getElementById('app-header');
    if (headerEl) {
      new Header({
        container: headerEl,
        store: this.store,
        actions: this.actions
      });
    }

    // Mount PostList component
    const mainEl = document.getElementById('app-main');
    if (mainEl) {
      new PostList({
        container: mainEl,
        store: this.store,
        actions: this.actions
      });
    }

    // Mount PostModal component
    const modalEl = document.getElementById('app-modal');
    if (modalEl) {
      new PostModal({
        container: modalEl,
        store: this.store,
        actions: this.actions
      });
    }

    // Mount LiveDrawer component
    const drawerEl = document.getElementById('app-live-drawer');
    if (drawerEl) {
      new LiveDrawer({
        container: drawerEl,
        store: this.store,
        actions: this.actions
      });
    }

    // Setup URL hash routing
    this.setupRouting();

    // Start Live updates polling every 5 seconds
    this.liveUpdateService.start();

    // Initial load: parse route or default to 'new'
    this.handleRoute();

    console.log('ClonerNews successfully mounted and live poller running.');
  }

  setupRouting() {
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  handleRoute() {
    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);

    const feedParam = params.get('feed');
    const postParam = params.get('post');

    if (postParam) {
      this.actions.openPost(postParam);
    } else if (feedParam && CONFIG.FEEDS[feedParam.toUpperCase()]) {
      this.actions.changeFeed(feedParam);
    } else {
      this.actions.changeFeed('new');
    }
  }
}

// Instantiate and boot when DOM is ready
if (typeof document !== 'undefined') {
  document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init().catch((err) => {
      console.error('Fatal initialization error:', err);
    });
  });
}
