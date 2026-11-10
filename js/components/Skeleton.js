/**
 * Shimmer Loading Skeleton UI Generator
 */

export class Skeleton {
  /**
   * Generates multiple placeholder post card skeletons.
   * @param {number} count Number of skeleton cards to render
   * @returns {string} HTML string
   */
  static renderPosts(count = 6) {
    return Array.from({ length: count })
      .map(
        () => `
        <div class="skeleton-card" aria-hidden="true">
          <div class="skeleton-badge"></div>
          <div class="skeleton-title"></div>
          <div class="skeleton-meta">
            <div class="skeleton-pill"></div>
            <div class="skeleton-pill"></div>
            <div class="skeleton-pill"></div>
          </div>
        </div>
      `
      )
      .join('');
  }

  /**
   * Generates placeholder comment thread skeletons.
   * @param {number} count
   * @returns {string} HTML string
   */
  static renderComments(count = 4) {
    return Array.from({ length: count })
      .map(
        () => `
        <div class="skeleton-comment" aria-hidden="true">
          <div class="skeleton-comment-header"></div>
          <div class="skeleton-comment-line"></div>
          <div class="skeleton-comment-line short"></div>
        </div>
      `
      )
      .join('');
  }
}
