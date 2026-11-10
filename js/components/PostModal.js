/**
 * Post Detail Modal Component
 *
 * Displays full details of Stories, Jobs, and Polls, and manages the
 * hierarchical comments discussion tree.
 */

import { formatRelativeTime, formatFullDateTime } from '../utils/time.js';
import { sanitizeHTML, escapeHTML } from '../utils/sanitizer.js';
import { PollView } from './PollView.js';
import { CommentTree } from './CommentTree.js';
import { Skeleton } from './Skeleton.js';

export class PostModal {
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

    this.renderLayout();
    this.bindEvents();

    this.store.subscribe((state, prev) => {
      if (
        state.activePost !== prev.activePost ||
        state.activePostComments !== prev.activePostComments ||
        state.commentsLoading !== prev.commentsLoading ||
        state.commentsError !== prev.commentsError
      ) {
        this.update(state);
      }
    });
  }

  renderLayout() {
    this.container.innerHTML = `
      <div class="modal-backdrop hidden" id="modal-backdrop"></div>
      <div class="modal-dialog hidden" id="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="modal-post-title">
        <div class="modal-content">
          <header class="modal-header">
            <div class="modal-badge-group">
              <span class="type-badge" id="modal-type-badge">STORY</span>
              <span class="modal-post-id" id="modal-post-id">#0</span>
            </div>
            <button class="modal-close-btn" id="modal-close-btn" aria-label="Close dialog">&times;</button>
          </header>

          <main class="modal-body">
            <h1 class="modal-title" id="modal-post-title">Loading story...</h1>

            <div class="modal-meta" id="modal-meta-bar">
              <!-- Meta items populated dynamically -->
            </div>

            <div class="modal-main-content" id="modal-main-content">
              <!-- Post text, external link, or poll options -->
            </div>

            <section class="modal-comments-section" id="modal-comments-section">
              <div class="comments-section-header">
                <h3>Discussion & Comments</h3>
                <span class="comments-sort-notice">Ordered newest to oldest</span>
              </div>
              <div class="comments-container" id="modal-comments-container">
                <!-- Comments tree or skeleton -->
              </div>
            </section>
          </main>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const backdrop = this.container.querySelector('#modal-backdrop');
    const closeBtn = this.container.querySelector('#modal-close-btn');

    backdrop.addEventListener('click', () => this.actions.closePost());
    closeBtn.addEventListener('click', () => this.actions.closePost());

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.store.getState().activePost) {
        this.actions.closePost();
      }
    });
  }

  update(state) {
    const backdrop = this.container.querySelector('#modal-backdrop');
    const dialog = this.container.querySelector('#modal-dialog');

    if (!state.activePost) {
      backdrop.classList.add('hidden');
      dialog.classList.add('hidden');
      document.body.classList.remove('modal-open');
      return;
    }

    backdrop.classList.remove('hidden');
    dialog.classList.remove('hidden');
    document.body.classList.add('modal-open');

    const post = state.activePost;
    const type = post.type || 'story';
    const titleEl = this.container.querySelector('#modal-post-title');
    const badgeEl = this.container.querySelector('#modal-type-badge');
    const idEl = this.container.querySelector('#modal-post-id');
    const metaBar = this.container.querySelector('#modal-meta-bar');
    const mainContent = this.container.querySelector('#modal-main-content');
    const commentsContainer = this.container.querySelector('#modal-comments-container');

    titleEl.textContent = post.title || 'Untitled';
    idEl.textContent = `#${post.id}`;
    badgeEl.className = `type-badge badge-${type}`;
    badgeEl.textContent = type.toUpperCase();

    const relativeTime = formatRelativeTime(post.time);
    const fullTime = formatFullDateTime(post.time);
    const author = escapeHTML(post.by || 'anonymous');
    const score = post.score !== undefined ? post.score : 0;
    const commentsCount = post.descendants !== undefined ? post.descendants : (Array.isArray(post.kids) ? post.kids.length : 0);

    metaBar.innerHTML = `
      ${type !== 'job' ? `<span class="meta-item"><strong>${score}</strong> points</span>` : ''}
      <span class="meta-item">Submitted by <strong class="author-name">@${author}</strong></span>
      <span class="meta-item" title="${fullTime}">${relativeTime}</span>
      ${type !== 'job' ? `<span class="meta-item"><strong>${commentsCount}</strong> comments</span>` : ''}
    `;

    let contentHtml = '';

    if (post.url) {
      let hostname = '';
      try {
        hostname = new URL(post.url).hostname.replace(/^www\./, '');
      } catch {
        hostname = 'external source';
      }

      contentHtml += `
        <div class="modal-link-box">
          <p class="modal-link-label">Original Article Source:</p>
          <a href="${escapeHTML(post.url)}" target="_blank" rel="noopener noreferrer nofollow" class="btn btn-primary modal-outbound-link">
            Open Article on ${hostname} &rarr;
          </a>
        </div>
      `;
    }

    if (type === 'poll') {
      contentHtml += `
        <div class="modal-poll-box">
          ${post.text ? `<div class="poll-question-desc">${sanitizeHTML(post.text)}</div>` : ''}
          ${PollView.renderOptions(post)}
        </div>
      `;
    } else if (post.text) {
      contentHtml += `
        <div class="modal-story-text">
          ${sanitizeHTML(post.text)}
        </div>
      `;
    }

    mainContent.innerHTML = contentHtml;

    if (state.commentsLoading) {
      commentsContainer.innerHTML = `
        <div class="comments-loading-state">
          <p>Fetching discussion thread...</p>
          ${Skeleton.renderComments(3)}
        </div>
      `;
    } else if (state.commentsError) {
      commentsContainer.innerHTML = `
        <div class="comments-error-box">
          <p>${state.commentsError}</p>
          <button class="btn btn-sm btn-outline" id="retry-comments-btn">Retry Comments</button>
        </div>
      `;
      const retryBtn = commentsContainer.querySelector('#retry-comments-btn');
      if (retryBtn) {
        retryBtn.addEventListener('click', () => this.actions.openPost(post.id));
      }
    } else {
      commentsContainer.innerHTML = CommentTree.render(state.activePostComments, post.id);
      CommentTree.bindEvents(commentsContainer);
    }
  }
}
