/**
 * Polymorphic Post Card Component
 *
 * Renders Stories, Jobs, Polls, Ask HN, and Show HN posts with a unified,
 * high-contrast corporate layout compliant with European accessibility mandates.
 */

import { formatRelativeTime, formatFullDateTime } from '../utils/time.js';
import { sanitizeHTML, escapeHTML } from '../utils/sanitizer.js';
import { PollView } from './PollView.js';

export class PostCard {
  /**
   * Generates the HTML for a single post item.
   *
   * @param {Object} item Post item from HN API
   * @param {number} [index] Position in list
   * @returns {string} HTML string
   */
  static render(item, index = null) {
    if (!item) return '';

    const id = item.id;
    const type = item.type || 'story';
    const title = escapeHTML(item.title || 'Untitled Story');
    const author = escapeHTML(item.by || 'anonymous');
    const score = item.score !== undefined ? item.score : 0;
    const commentsCount = item.descendants !== undefined ? item.descendants : (Array.isArray(item.kids) ? item.kids.length : 0);
    const relativeTime = formatRelativeTime(item.time);
    const fullTime = formatFullDateTime(item.time);

    // Domain extraction for external links
    let domain = '';
    if (item.url) {
      try {
        const parsed = new URL(item.url);
        domain = parsed.hostname.replace(/^www\./, '');
      } catch {
        domain = 'link';
      }
    }

    // Determine specific badge
    let badgeType = type;
    let badgeLabel = type.toUpperCase();

    if (item.title && item.title.startsWith('Ask HN:')) {
      badgeType = 'ask';
      badgeLabel = 'ASK HN';
    } else if (item.title && item.title.startsWith('Show HN:')) {
      badgeType = 'show';
      badgeLabel = 'SHOW HN';
    } else if (type === 'poll') {
      badgeType = 'poll';
      badgeLabel = 'POLL';
    } else if (type === 'job') {
      badgeType = 'job';
      badgeLabel = 'JOB';
    } else {
      badgeType = 'story';
      badgeLabel = 'STORY';
    }

    // Content specific previews
    let specificContent = '';

    if (type === 'poll') {
      specificContent = `
        <div class="card-poll-preview">
          ${PollView.renderOptions(item)}
        </div>
      `;
    } else if (item.text) {
      const sanitizedText = sanitizeHTML(item.text);
      specificContent = `
        <div class="card-self-text">
          ${sanitizedText}
        </div>
      `;
    }

    const indexHtml = index !== null ? `<span class="card-index">${index + 1}.</span>` : '';

    return `
      <article class="post-card post-type-${badgeType}" data-id="${id}" data-type="${type}">
        <div class="card-main">
          ${indexHtml}
          <div class="card-body">
            <header class="card-header">
              <span class="type-badge badge-${badgeType}">${badgeLabel}</span>
              <h2 class="card-title">
                ${
                  item.url
                    ? `<a href="${escapeHTML(item.url)}" target="_blank" rel="noopener noreferrer nofollow" class="card-link" data-prevent-modal="true">
                        ${title}
                        <span class="external-domain">(${domain}) ↗</span>
                       </a>`
                    : `<button class="card-title-btn" data-action="open-post" data-id="${id}">${title}</button>`
                }
              </h2>
            </header>

            ${specificContent}

            <footer class="card-meta">
              ${type !== 'job' ? `<span class="meta-item meta-score"><strong>${score}</strong> points</span>` : ''}
              <span class="meta-item meta-author">by <span class="author-name">@${author}</span></span>
              <span class="meta-item meta-time" title="${fullTime}">${relativeTime}</span>
              ${
                type !== 'job'
                  ? `<button class="meta-item meta-comments-btn" data-action="open-post" data-id="${id}" aria-label="${commentsCount} comments">
                      ${commentsCount} ${commentsCount === 1 ? 'comment' : 'comments'}
                     </button>`
                  : `<span class="meta-item meta-job-notice">Direct Employment</span>`
              }
              <button class="card-view-btn" data-action="open-post" data-id="${id}" title="View thread and discussion">
                Discussion &rarr;
              </button>
            </footer>
          </div>
        </div>
      </article>
    `;
  }
}
