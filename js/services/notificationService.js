/**
 * Notification Service
 *
 * Manages toast notifications and interactive live update banners.
 */

export class NotificationService {
  constructor(containerElement = null) {
    this.container = containerElement;
    this.toasts = new Map();
    this.idCounter = 0;
  }

  /**
   * Mounts the notification container if not already set.
   * @param {HTMLElement} element
   */
  mount(element) {
    this.container = element;
  }

  /**
   * Displays an interactive or self-dismissing toast.
   *
   * @param {Object} options
   * @param {string} options.message Toast body text
   * @param {string} [options.title] Optional header
   * @param {'info'|'success'|'warning'|'error'} [options.type='info'] Toast type
   * @param {number} [options.duration=4500] Auto-dismiss duration in ms (0 for persistent)
   * @param {string} [options.actionText] Optional button label
   * @param {() => void} [options.onAction] Callback when action button is clicked
   * @returns {string} Toast ID
   */
  showToast({
    message,
    title = '',
    type = 'info',
    duration = 4500,
    actionText = null,
    onAction = null
  }) {
    if (!this.container) {
      console.warn('[NotificationService] Container not mounted.');
      return null;
    }

    const id = `toast-${++this.idCounter}`;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type} toast-enter`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('id', id);

    const icons = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌'
    };

    let actionBtnHtml = '';
    if (actionText && typeof onAction === 'function') {
      actionBtnHtml = `<button class="toast-action-btn" data-action-id="${id}">${actionText}</button>`;
    }

    toast.innerHTML = `
      <div class="toast-icon">${icons[type] || '🔔'}</div>
      <div class="toast-content">
        ${title ? `<strong class="toast-title">${title}</strong>` : ''}
        <span class="toast-message">${message}</span>
      </div>
      ${actionBtnHtml}
      <button class="toast-close-btn" aria-label="Close notification">&times;</button>
    `;

    // Action button listener
    if (actionText && typeof onAction === 'function') {
      const btn = toast.querySelector('.toast-action-btn');
      btn.addEventListener('click', () => {
        onAction();
        this.dismiss(id);
      });
    }

    // Close button listener
    const closeBtn = toast.querySelector('.toast-close-btn');
    closeBtn.addEventListener('click', () => this.dismiss(id));

    this.container.appendChild(toast);

    // Auto-dismiss timer
    let timer = null;
    if (duration > 0) {
      timer = setTimeout(() => this.dismiss(id), duration);
    }

    this.toasts.set(id, { element: toast, timer });

    // Trigger enter transition
    requestAnimationFrame(() => {
      toast.classList.remove('toast-enter');
    });

    return id;
  }

  /**
   * Dismisses a specific toast with an exit transition.
   * @param {string} id
   */
  dismiss(id) {
    const entry = this.toasts.get(id);
    if (!entry) return;

    if (entry.timer) clearTimeout(entry.timer);

    entry.element.classList.add('toast-exit');
    entry.element.addEventListener('animationend', () => {
      entry.element.remove();
      this.toasts.delete(id);
    });
  }

  /**
   * Clears all active toasts.
   */
  clearAll() {
    for (const id of this.toasts.keys()) {
      this.dismiss(id);
    }
  }
}
