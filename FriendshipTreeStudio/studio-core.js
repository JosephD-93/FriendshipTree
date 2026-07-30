/* FriendshipTree Studio 2.14.1
 * Small shared event backbone for renderer subsystems.
 */
(() => {
  'use strict';

  const listeners = new Map();

  function on(type, handler) {
    if (!type || typeof handler !== 'function') return () => {};
    if (!listeners.has(type)) listeners.set(type, new Set());
    listeners.get(type).add(handler);
    return () => off(type, handler);
  }

  function off(type, handler) {
    listeners.get(type)?.delete(handler);
  }

  function emit(type, detail = {}) {
    const event = {
      type,
      detail: detail && typeof detail === 'object' ? detail : { value: detail },
      createdAt: new Date().toISOString()
    };

    listeners.get(type)?.forEach(handler => {
      try { handler(event.detail, event); }
      catch (error) { console.error(`Studio event handler failed: ${type}`, error); }
    });
    listeners.get('*')?.forEach(handler => {
      try { handler(event.detail, event); }
      catch (error) { console.error(`Studio wildcard event handler failed: ${type}`, error); }
    });

    window.dispatchEvent(new CustomEvent('studio-event', { detail: event }));
    return event;
  }

  window.StudioEvents = Object.freeze({ on, off, emit });
  document.documentElement.dataset.studioCoreReady = 'true';
})();
