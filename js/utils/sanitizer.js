/**
 * HTML Sanitizer for Hacker News item and comment text.
 * Prevents XSS attacks while safely allowing standard formatting tags and links.
 */

const ALLOWED_TAGS = new Set([
  'p', 'a', 'b', 'i', 'strong', 'em', 'code', 'pre', 'blockquote',
  'ul', 'ol', 'li', 'br', 'span', 'div'
]);

const ALLOWED_ATTRS = {
  a: new Set(['href', 'title', 'target', 'rel']),
  code: new Set(['class']),
  pre: new Set(['class']),
  span: new Set(['class'])
};

/**
 * Escapes raw text for HTML embedding.
 * @param {string} str
 * @returns {string}
 */
export function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes an HTML string, preserving allowed markup and safe links.
 * Works across both Browser DOM and Node.js test environments.
 *
 * @param {string} html
 * @returns {string}
 */
export function sanitizeHTML(html) {
  if (!html || typeof html !== 'string') return '';

  // Environment detection: Browser
  if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(`<body>${html}</body>`, 'text/html');
    cleanNode(doc.body);
    return doc.body.innerHTML;
  }

  // Fallback for Node.js test environments
  return sanitizeWithRegex(html);
}

/**
 * Recursively cleans a DOM element and its children.
 * @param {Node} node
 */
function cleanNode(node) {
  const children = Array.from(node.childNodes);

  for (const child of children) {
    if (child.nodeType === 1) { // ELEMENT_NODE
      const tagName = child.tagName.toLowerCase();

      if (!ALLOWED_TAGS.has(tagName)) {
        // Disallowed tag: replace with text content or remove if script/style
        if (tagName === 'script' || tagName === 'style' || tagName === 'iframe' || tagName === 'object') {
          node.removeChild(child);
        } else {
          const textNode = document.createTextNode(child.textContent || '');
          node.replaceChild(textNode, child);
        }
        continue;
      }

      // Clean attributes
      const allowedAttrsForTag = ALLOWED_ATTRS[tagName] || new Set();
      const attrs = Array.from(child.attributes);

      for (const attr of attrs) {
        const attrName = attr.name.toLowerCase();
        if (!allowedAttrsForTag.has(attrName)) {
          child.removeAttribute(attr.name);
          continue;
        }

        // Validate links specifically
        if (tagName === 'a' && attrName === 'href') {
          const hrefValue = attr.value.trim().toLowerCase();
          if (!hrefValue.startsWith('http://') && !hrefValue.startsWith('https://')) {
            child.removeAttribute('href');
          } else {
            child.setAttribute('target', '_blank');
            child.setAttribute('rel', 'noopener noreferrer nofollow');
          }
        }
      }

      cleanNode(child);
    } else if (child.nodeType === 3) {
      // TEXT_NODE: valid
    } else {
      // Comment or other node types: remove
      node.removeChild(child);
    }
  }
}

/**
 * Node.js-safe regex sanitizer fallback for testing without full DOM.
 * @param {string} html
 * @returns {string}
 */
function sanitizeWithRegex(html) {
  // Strip dangerous tags completely
  let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  clean = clean.replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '');
  clean = clean.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '');
  
  // Strip on* event attributes
  clean = clean.replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '');
  clean = clean.replace(/\son\w+\s*=\s*[^ >]+/gi, '');

  // Strip javascript: URLs
  clean = clean.replace(/href\s*=\s*(['"])\s*javascript:[^'"]*?\1/gi, '');

  return clean;
}
