/**
 * Poll View Component
 *
 * Renders interactive poll cards with options, vote counts, and percentage bars.
 */

import { sanitizeHTML } from '../utils/sanitizer.js';

export class PollView {
  /**
   * Renders poll options HTML with percentage distribution bars.
   * @param {Object} pollItem Enriched poll item containing pollOptions
   * @returns {string} HTML string
   */
  static renderOptions(pollItem) {
    if (!pollItem || !Array.isArray(pollItem.pollOptions) || pollItem.pollOptions.length === 0) {
      return '<div class="poll-empty">No options recorded for this poll.</div>';
    }

    const totalVotes = pollItem.totalVotes || 0;

    return `
      <div class="poll-container">
        <div class="poll-header">
          <span class="poll-total-votes">Total Votes: <strong>${totalVotes}</strong></span>
        </div>
        <div class="poll-options-list">
          ${pollItem.pollOptions
            .map((opt, index) => {
              const safeText = sanitizeHTML(opt.text);
              const percentage = opt.percentage || 0;
              return `
                <div class="poll-option-item">
                  <div class="poll-option-info">
                    <span class="poll-option-text">${safeText}</span>
                    <span class="poll-option-stats">${opt.score} pts (${percentage}%)</span>
                  </div>
                  <div class="poll-bar-track" role="progressbar" aria-valuenow="${percentage}" aria-valuemin="0" aria-valuemax="100">
                    <div class="poll-bar-fill" style="width: ${percentage}%;"></div>
                  </div>
                </div>
              `;
            })
            .join('')}
        </div>
      </div>
    `;
  }
}
