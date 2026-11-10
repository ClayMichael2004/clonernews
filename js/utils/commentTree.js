/**
 * Hierarchical Nested Comment Tree Data Structure and Sorting Utilities
 *
 * Reconstructs an N-ary tree from flat or nested Hacker News comments,
 * associates every comment with its correct parent post/comment,
 * and sorts all sibling comments strictly from newest to oldest.
 */

import { sortByNewest } from './time.js';

export class CommentNode {
  /**
   * @param {Object} item Raw HN comment item
   * @param {number|string} rootPostId ID of the top-level post
   * @param {number} depth Tree depth level (0 = top-level comment)
   */
  constructor(item, rootPostId, depth = 0) {
    this.id = item.id;
    this.parent = item.parent;
    this.rootPostId = rootPostId;
    this.by = item.by || '[anonymous]';
    this.time = item.time || 0;
    this.text = item.text || (item.deleted ? '<em>[deleted]</em>' : item.dead ? '<em>[flagged/dead]</em>' : '');
    this.deleted = Boolean(item.deleted);
    this.dead = Boolean(item.dead);
    this.rawKids = Array.isArray(item.kids) ? item.kids : [];
    this.depth = depth;
    this.children = [];
    this.collapsed = false;
  }

  /**
   * Calculates total descendant replies underneath this node.
   * @returns {number}
   */
  getDescendantCount() {
    let count = this.children.length;
    for (const child of this.children) {
      count += child.getDescendantCount();
    }
    return count;
  }
}

/**
 * Builds a nested comment tree from a list of fetched comment items,
 * associating each comment with its parent and sorting each level
 * from newest to oldest.
 *
 * @param {Array<Object>} rawComments Array of fetched comment items
 * @param {number|string} rootPostId The root post ID
 * @returns {Array<CommentNode>} Top-level comment nodes sorted newest to oldest
 */
export function buildCommentTree(rawComments, rootPostId) {
  if (!Array.isArray(rawComments) || rawComments.length === 0) {
    return [];
  }

  const nodeMap = new Map();
  const rootComments = [];

  // Pass 1: Instantiate nodes
  for (const item of rawComments) {
    if (!item || !item.id) continue;
    const node = new CommentNode(item, rootPostId);
    nodeMap.set(Number(item.id), node);
  }

  // Pass 2: Establish parent-child linkages
  for (const node of nodeMap.values()) {
    const parentId = Number(node.parent);
    
    if (parentId === Number(rootPostId)) {
      // Top-level comment directly under the post
      node.depth = 0;
      rootComments.push(node);
    } else if (nodeMap.has(parentId)) {
      // Nested sub-comment under another comment
      const parentNode = nodeMap.get(parentId);
      node.depth = parentNode.depth + 1;
      parentNode.children.push(node);
    } else {
      // Orphan or direct child whose parent might be the post or not in map
      node.depth = 0;
      rootComments.push(node);
    }
  }

  // Pass 3: Recursively sort every level from newest to oldest
  function sortLevel(nodes) {
    sortByNewest(nodes, false); // sort in place
    for (const node of nodes) {
      if (node.children.length > 0) {
        sortLevel(node.children);
      }
    }
  }

  sortLevel(rootComments);
  return rootComments;
}
