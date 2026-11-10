/**
 * High-performance O(1) Least Recently Used (LRU) Cache
 * Implemented using a Doubly Linked List and Hash Map.
 */

class DoublyLinkedNode {
  constructor(key, value) {
    this.key = key;
    this.value = value;
    this.prev = null;
    this.next = null;
  }
}

export class LRUCache {
  /**
   * @param {number} capacity Maximum entries to retain
   */
  constructor(capacity = 500) {
    this.capacity = Math.max(1, capacity);
    this.map = new Map();
    this.head = new DoublyLinkedNode(null, null); // sentinel dummy head
    this.tail = new DoublyLinkedNode(null, null); // sentinel dummy tail
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Retrieves an item from the cache and marks it as recently used.
   * @param {string|number} key
   * @returns {*} Cached value or undefined
   */
  get(key) {
    const stringKey = String(key);
    const node = this.map.get(stringKey);
    if (!node) return undefined;

    this._detach(node);
    this._attachToHead(node);
    return node.value;
  }

  /**
   * Inserts or updates an item in the cache. Evicts LRU item if capacity is exceeded.
   * @param {string|number} key
   * @param {*} value
   */
  set(key, value) {
    const stringKey = String(key);
    let node = this.map.get(stringKey);

    if (node) {
      node.value = value;
      this._detach(node);
      this._attachToHead(node);
    } else {
      if (this.map.size >= this.capacity) {
        this._evictLRU();
      }
      node = new DoublyLinkedNode(stringKey, value);
      this.map.set(stringKey, node);
      this._attachToHead(node);
    }
  }

  /**
   * Checks if key exists without marking as recently used.
   * @param {string|number} key
   * @returns {boolean}
   */
  has(key) {
    return this.map.has(String(key));
  }

  /**
   * Removes a specific item.
   * @param {string|number} key
   */
  delete(key) {
    const stringKey = String(key);
    const node = this.map.get(stringKey);
    if (node) {
      this._detach(node);
      this.map.delete(stringKey);
    }
  }

  /**
   * Clears the cache.
   */
  clear() {
    this.map.clear();
    this.head.next = this.tail;
    this.tail.prev = this.head;
  }

  /**
   * Current number of cached items.
   * @returns {number}
   */
  get size() {
    return this.map.size;
  }

  // --- Internal linked list helpers ---

  _detach(node) {
    node.prev.next = node.next;
    node.next.prev = node.prev;
  }

  _attachToHead(node) {
    node.next = this.head.next;
    node.prev = this.head;
    this.head.next.prev = node;
    this.head.next = node;
  }

  _evictLRU() {
    const lruNode = this.tail.prev;
    if (lruNode && lruNode !== this.head) {
      this._detach(lruNode);
      this.map.delete(lruNode.key);
    }
  }
}
