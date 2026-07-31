/* FriendshipTree Studio 2.14.0
 * Central notification centre.
 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const button = $('studioNotificationButton');
  const badge = $('studioNotificationBadge');
  const drawerBackdrop = $('studioNotificationDrawer');
  const list = $('studioNotificationList');
  const closeButton = $('closeNotificationDrawer');
  const markAllButton = $('markAllNotificationsRead');
  const clearAllButton = $('clearAllNotifications');
  const filterBar = $('notificationFilterBar');
  if (!button || !badge || !drawerBackdrop || !list) return;

  const state = {
    items: [],
    filter: 'all',
    maxItems: 200,
    storageKey: 'friendshiptree-studio-notifications-v1'
  };

  const icons = {
    info: 'ℹ️',
    success: '✅',
    warning: '⚠️',
    error: '⛔'
  };

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function load() {
    try {
      const parsed = JSON.parse(localStorage.getItem(state.storageKey) || '[]');
      state.items = Array.isArray(parsed) ? parsed.slice(0, state.maxItems) : [];
    } catch {
      state.items = [];
    }
  }

  function save() {
    try {
      localStorage.setItem(state.storageKey, JSON.stringify(state.items.slice(0, state.maxItems)));
    } catch {}
  }

  function unreadCount() {
    return state.items.filter(item => !item.read).length;
  }

  function updateBadge() {
    const count = unreadCount();
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.hidden = count === 0;
    button.classList.toggle('has-unread', count > 0);
  }

  function relativeTime(timestamp) {
    const date = new Date(timestamp);
    const diff = Date.now() - date.getTime();
    if (!Number.isFinite(diff)) return '';
    const seconds = Math.floor(diff / 1000);
    if (seconds < 45) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleString();
  }

  function filteredItems() {
    if (state.filter === 'all') return state.items;
    if (state.filter === 'unread') return state.items.filter(item => !item.read);
    return state.items.filter(item => item.type === state.filter);
  }

  function render() {
    updateBadge();
    filterBar?.querySelectorAll('[data-notification-filter]').forEach(control => {
      control.classList.toggle('active', control.dataset.notificationFilter === state.filter);
    });

    const items = filteredItems();
    if (!items.length) {
      list.innerHTML = `<div class="notification-empty">
        <span>🔕</span>
        <b>No notifications here</b>
        <small>New Studio activity will appear in this list.</small>
      </div>`;
      return;
    }

    list.innerHTML = items.map(item => `
      <article class="notification-item ${item.read ? '' : 'unread'} notification-${escapeHtml(item.type)}" data-notification-id="${escapeHtml(item.id)}">
        <button class="notification-main" type="button" data-notification-open="${escapeHtml(item.id)}">
          <span class="notification-icon">${escapeHtml(icons[item.type] || icons.info)}</span>
          <span class="notification-copy">
            <span class="notification-title-row">
              <b>${escapeHtml(item.title)}</b>
              <time>${escapeHtml(relativeTime(item.createdAt))}</time>
            </span>
            ${item.message ? `<p>${escapeHtml(item.message)}</p>` : ''}
            ${item.source ? `<small>${escapeHtml(item.source)}</small>` : ''}
          </span>
        </button>
        <div class="notification-item-actions">
          ${item.commandId ? `<button type="button" data-notification-command="${escapeHtml(item.commandId)}" title="Run related command">Run</button>` : ''}
          ${item.page ? `<button type="button" data-notification-page="${escapeHtml(item.page)}" title="Open related page">Open</button>` : ''}
          <button type="button" data-notification-toggle-read="${escapeHtml(item.id)}">${item.read ? 'Unread' : 'Read'}</button>
          <button type="button" data-notification-delete="${escapeHtml(item.id)}" aria-label="Delete notification">×</button>
        </div>
      </article>
    `).join('');
  }

  function add(notification) {
    const item = {
      id: notification.id || `notification-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: ['info', 'success', 'warning', 'error'].includes(notification.type) ? notification.type : 'info',
      title: notification.title || 'Studio notification',
      message: notification.message || '',
      source: notification.source || '',
      page: notification.page || '',
      commandId: notification.commandId || '',
      createdAt: notification.createdAt || new Date().toISOString(),
      read: Boolean(notification.read)
    };
    state.items.unshift(item);
    state.items = state.items.slice(0, state.maxItems);
    save();
    render();
    return item.id;
  }

  function remove(id) {
    state.items = state.items.filter(item => item.id !== id);
    save();
    render();
  }

  function markRead(id, read = true) {
    const item = state.items.find(candidate => candidate.id === id);
    if (item) item.read = read;
    save();
    render();
  }

  function markAllRead() {
    state.items.forEach(item => { item.read = true; });
    save();
    render();
  }

  function clearAll() {
    state.items = [];
    save();
    render();
  }

  function open() {
    drawerBackdrop.hidden = false;
    document.body.classList.add('notification-drawer-open');
    render();
  }

  function close() {
    drawerBackdrop.hidden = true;
    document.body.classList.remove('notification-drawer-open');
  }

  function navigate(page) {
    document.querySelector(`[data-nav-page="${CSS.escape(page)}"]`)?.click();
  }

  function runCommand(commandId) {
    if (window.studioCommands?.run) {
      window.studioCommands.run(commandId);
      close();
    }
  }

  button.addEventListener('click', open);
  closeButton?.addEventListener('click', close);
  drawerBackdrop.addEventListener('mousedown', event => {
    if (event.target === drawerBackdrop) close();
  });
  markAllButton?.addEventListener('click', markAllRead);
  clearAllButton?.addEventListener('click', clearAll);

  filterBar?.addEventListener('click', event => {
    const control = event.target.closest('[data-notification-filter]');
    if (!control) return;
    state.filter = control.dataset.notificationFilter;
    render();
  });

  list.addEventListener('click', event => {
    const command = event.target.closest('[data-notification-command]');
    if (command) {
      runCommand(command.dataset.notificationCommand);
      return;
    }
    const page = event.target.closest('[data-notification-page]');
    if (page) {
      navigate(page.dataset.notificationPage);
      close();
      return;
    }
    const toggle = event.target.closest('[data-notification-toggle-read]');
    if (toggle) {
      const item = state.items.find(candidate => candidate.id === toggle.dataset.notificationToggleRead);
      if (item) markRead(item.id, !item.read);
      return;
    }
    const removeButton = event.target.closest('[data-notification-delete]');
    if (removeButton) {
      remove(removeButton.dataset.notificationDelete);
      return;
    }
    const openButton = event.target.closest('[data-notification-open]');
    if (openButton) {
      const item = state.items.find(candidate => candidate.id === openButton.dataset.notificationOpen);
      if (!item) return;
      markRead(item.id, true);
      if (item.page) {
        navigate(item.page);
        close();
      } else if (item.commandId) {
        runCommand(item.commandId);
      }
    }
  });

  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !drawerBackdrop.hidden) {
      event.preventDefault();
      close();
    }
  });

  // Command completion automatically becomes a success notification.
  window.addEventListener('studio-command-ran', event => {
    const detail = event.detail || {};
    add({
      type: 'success',
      title: detail.title || 'Command completed',
      message: 'Studio finished running this command.',
      source: 'Command Palette',
      commandId: detail.id || ''
    });
  });


  // Studio Core events are converted into useful notifications in one place.
  window.addEventListener('studio-event', event => {
    const envelope = event.detail || {};
    const detail = envelope.detail || {};
    const type = envelope.type || '';

    if (type === 'health.complete') {
      const failures = Number(detail.failed || 0);
      const warnings = Number(detail.warnings || 0);
      add({
        type: failures ? 'error' : warnings ? 'warning' : 'success',
        title: failures ? 'Health check found problems' : warnings ? 'Health check completed with warnings' : 'Full health check passed',
        message: `${Number(detail.passed || 0)} passed, ${warnings} warning${warnings === 1 ? '' : 's'}, ${failures} failed. Score: ${Number(detail.score || 0)}%.`,
        source: 'Developer Diagnostics Centre',
        page: 'developer'
      });
      return;
    }

    if (type === 'task.complete') {
      add({ type: 'success', title: detail.title || 'Task completed', message: detail.message || 'Finished successfully.', source: detail.source || 'Studio', page: detail.page || '' });
    } else if (type === 'task.failed') {
      add({ type: 'error', title: detail.title || 'Task failed', message: detail.message || 'An unknown error occurred.', source: detail.source || 'Studio', page: detail.page || '' });
    } else if (type === 'brain.ready') {
      add({ type: 'success', title: 'Project Brain ready', message: detail.message || 'The project database loaded successfully.', source: 'Project Brain', page: 'brain' });
    } else if (type === 'brain.failed') {
      add({ type: 'error', title: 'Project Brain failed to load', message: detail.message || 'Project Brain is unavailable.', source: 'Project Brain', page: 'brain' });
    }
  });

  // Generic integration point for any Studio subsystem.
  window.addEventListener('studio-notify', event => {
    if (event.detail) add(event.detail);
  });

  load();

  // First-run message explains the new system once.
  if (!state.items.length) {
    add({
      type: 'info',
      title: 'Notification Centre is ready',
      message: 'Builds, commands, diagnostics, warnings and other important Studio activity can now appear here.',
      source: 'FriendshipTree Studio 2.14.0',
      read: false
    });
  } else {
    render();
  }

  window.studioNotifications = {
    add,
    remove,
    markRead,
    markAllRead,
    clearAll,
    open,
    close,
    list: () => state.items.map(item => ({ ...item })),
    getUnreadCount: unreadCount,
    success: (title, message, options = {}) => add({ ...options, type: 'success', title, message }),
    warning: (title, message, options = {}) => add({ ...options, type: 'warning', title, message }),
    error: (title, message, options = {}) => add({ ...options, type: 'error', title, message }),
    info: (title, message, options = {}) => add({ ...options, type: 'info', title, message })
  };
})();