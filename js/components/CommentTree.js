/**
 * Comment Tree Component
 *
 * Renders recursive, nested comment threads with collapse/expand affordances,
 * parent relationship indicators, and strict newest-to-oldest ordering.
 */

import { formatRelativeTime, formatFullDateTime } from '../utils/time.js';
import { sanitizeHTML, escapeHTML } from '../utils/sanitizer.js';

export class CommentTree {
  /**
   * Generates the complete HTML for a tree of comment nodes.
   *
   * @param {Array<import('../utils/commentTree.js').CommentNode>} rootNodes
   * @param {number|string} rootPostId
   * @returns {string}
   */
  static render(rootNodes, rootPostId) {
    if (!Array.isArray(rootNodes) || rootNodes.length === 0) {
      return `
        <div class="comments-empty">
          <p>No comments on this story yet.</p>
        </div>
      `;
    }

    return `
      <div class="comment-thread-container" data-post-id="${rootPostId}">
        <div class="comment-thread-header">
          <span class="thread-count">Showing <strong>${rootNodes.length}</strong> top-level discussion threads (newest first)</span>
          <button class="thread-collapse-all-btn" id="thread-toggle-all-btn">Collapse All</button>
        </div>
        <div class="comments-list">
          ${rootNodes.map((node) => CommentTree.renderNode(node, rootPostId)).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Renders a single CommentNode and recursively renders its nested children.
   *
   * @param {import('../utils/commentTree.js').CommentNode} node
   * @param {number|string} rootPostId
   * @returns {string} HTML string
   */
  static renderNode(node, rootPostId) {
    if (!node) return '';

    const author = escapeHTML(node.by);
    const relativeTime = formatRelativeTime(node.time);
    const fullTime = formatFullDateTime(node.time);
    const sanitizedText = sanitizeHTML(node.text);
    const descendantCount = node.getDescendantCount();
    const isDirectChild = Number(node.parent) === Number(rootPostId);

    const parentLabel = isDirectChild
      ? `<span class="comment-parent-ref">direct reply</span>`
      : `<span class="comment-parent-ref">reply to #${node.parent}</span>`;

    const hasChildren = node.children && node.children.length > 0;

    return `
      <div class="comment-node depth-${Math.min(node.depth, 8)}" id="comment-${node.id}" data-id="${node.id}" data-parent="${node.parent}">
        <div class="comment-card ${node.deleted ? 'comment-deleted' : ''}">
          <header class="comment-header">
            <button class="comment-collapse-btn" data-action="toggle-comment" data-id="${node.id}" aria-label="Toggle comment thread">
              <span class="collapse-icon">[-]</span>
            </button>
            <strong class="comment-author">@${author}</strong>
            <span class="comment-time" title="${fullTime}">${relativeTime}</span>
            ${parentLabel}
            ${
              hasChildren
                ? `<span class="comment-reply-count">(${descendantCount} ${descendantCount === 1 ? 'reply' : 'replies'})</span>`
                : ''
            }
          </header>

          <div class="comment-body" id="comment-body-${node.id}">
            <div class="comment-content">
              ${sanitizedText || '<em>(no text)</em>'}
            </div>
          </div>
        </div>

        ${
          hasChildren
            ? `
            <div class="comment-children" id="children-${node.id}">
              ${node.children.map((child) => CommentTree.renderNode(child, rootPostId)).join('')}
            </div>
            `
            : ''
        }
      </div>
    `;
  }

  /**
   * Attaches interactive event handlers to a rendered comment tree container.
   * @param {HTMLElement} container
   */
  static bindEvents(container) {
    if (!container) return;

    // Toggle individual comment thread
    container.addEventListener('click', (e) => {
      const toggleBtn = e.target.closest('[data-action="toggle-comment"]');
      if (toggleBtn) {
        const commentId = toggleBtn.dataset.id;
        const commentNode = container.querySelector(`#comment-${commentId}`);
        if (commentNode) {
          const body = commentNode.querySelector(`#comment-body-${commentId}`);
          const children = commentNode.querySelector(`#children-${commentId}`);
          const icon = toggleBtn.querySelector('.collapse-icon');

          const isCollapsed = commentNode.classList.toggle('collapsed');
          if (body) body.classList.toggle('hidden', isCollapsed);
          if (children) children.classList.toggle('hidden', isCollapsed);
          if (icon) icon.textContent = isCollapsed ? '[+]' : '[-]';
        }
      }
    });

    // Toggle all comments collapse/expand
    const toggleAllBtn = container.querySelector('#thread-toggle-all-btn');
    if (toggleAllBtn) {
      let allCollapsed = false;
      toggleAllBtn.addEventListener('click', () => {
        allCollapsed = !allCollapsed;
        toggleAllBtn.textContent = allCollapsed ? 'Expand All' : 'Collapse All';

        const nodes = container.querySelectorAll('.comment-node');
        nodes.forEach((node) => {
          const id = node.dataset.id;
          const body = node.querySelector(`#comment-body-${id}`);
          const children = node.querySelector(`#children-${id}`);
          const icon = node.querySelector('.collapse-icon');

          node.classList.toggle('collapsed', allCollapsed);
          if (body) body.classList.toggle('hidden', allCollapsed);
          if (children) children.classList.toggle('hidden', allCollapsed);
          if (icon) icon.textContent = allCollapsed ? '[+]' : '[-]';
        });
      });
    }
  }
}
