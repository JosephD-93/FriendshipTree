/* FriendshipTree Studio 2.13.0
 * Central command registry and command palette.
 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const palette = $('studioCommandPalette');
  const input = $('commandPaletteInput');
  const results = $('commandPaletteResults');
  const closeButton = $('closeCommandPalette');
  if (!palette || !input || !results) return;

  const state = {
    commands: new Map(),
    filtered: [],
    activeIndex: 0,
    favourites: new Set(),
    recents: [],
    storageKey: 'friendshiptree-studio-command-state-v1'
  };

  function normalise(value) {
    return String(value || '').toLowerCase().replace(/[^\p{L}\p{N}._:/\\-]+/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function loadPersisted() {
    try {
      const parsed = JSON.parse(localStorage.getItem(state.storageKey) || '{}');
      state.favourites = new Set(Array.isArray(parsed.favourites) ? parsed.favourites : []);
      state.recents = Array.isArray(parsed.recents) ? parsed.recents.slice(0, 12) : [];
    } catch {
      state.favourites = new Set();
      state.recents = [];
    }
  }

  function persist() {
    try {
      localStorage.setItem(state.storageKey, JSON.stringify({
        favourites: [...state.favourites],
        recents: state.recents.slice(0, 12)
      }));
    } catch {}
  }

  function register(command) {
    if (!command || !command.id || !command.title || typeof command.run !== 'function') return false;
    state.commands.set(command.id, {
      category: 'Studio',
      icon: '⚡',
      description: '',
      keywords: [],
      ...command
    });
    return true;
  }

  function unregister(id) {
    return state.commands.delete(id);
  }

  function score(command, query, tokens) {
    if (!query) {
      if (state.favourites.has(command.id)) return 1000;
      const recentIndex = state.recents.indexOf(command.id);
      if (recentIndex >= 0) return 700 - recentIndex;
      return 50;
    }
    const title = normalise(command.title);
    const category = normalise(command.category);
    const description = normalise(command.description);
    const keywords = normalise(Array.isArray(command.keywords) ? command.keywords.join(' ') : command.keywords);
    const haystack = `${title} ${category} ${description} ${keywords}`;
    if (!tokens.every(token => haystack.includes(token))) return 0;

    let value = 10;
    if (title === query) value += 150;
    if (title.startsWith(query)) value += 100;
    if (title.includes(query)) value += 70;
    if (category.includes(query)) value += 30;
    if (keywords.includes(query)) value += 25;
    if (state.favourites.has(command.id)) value += 15;
    return value;
  }

  function refresh() {
    const query = normalise(input.value);
    const tokens = query.split(' ').filter(Boolean);
    state.filtered = [...state.commands.values()]
      .map(command => ({ command, score: score(command, query, tokens) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.command.title.localeCompare(b.command.title))
      .map(item => item.command)
      .slice(0, 80);
    state.activeIndex = Math.min(state.activeIndex, Math.max(0, state.filtered.length - 1));
    render(query);
  }

  function render(query) {
    if (!state.filtered.length) {
      results.innerHTML = `<div class="command-palette-empty"><b>No command found</b><span>Nothing matches “${escapeHtml(query)}”.</span></div>`;
      return;
    }

    results.innerHTML = state.filtered.map((command, index) => {
      const favourite = state.favourites.has(command.id);
      const recent = state.recents.includes(command.id);
      return `<div class="command-result-row ${index === state.activeIndex ? 'active' : ''}" data-command-index="${index}">
        <button class="command-run-button" type="button" role="option" data-command-run="${escapeHtml(command.id)}">
          <span class="command-icon">${escapeHtml(command.icon || '⚡')}</span>
          <span class="command-copy">
            <b>${escapeHtml(command.title)}</b>
            <small>${escapeHtml(command.category)}${command.description ? ` · ${escapeHtml(command.description)}` : ''}</small>
          </span>
          ${recent ? '<span class="command-recent">Recent</span>' : ''}
        </button>
        <button class="command-favourite-button ${favourite ? 'selected' : ''}" type="button"
          aria-label="${favourite ? 'Remove from favourites' : 'Add to favourites'}"
          title="${favourite ? 'Remove from favourites' : 'Add to favourites'}"
          data-command-favourite="${escapeHtml(command.id)}">★</button>
      </div>`;
    }).join('');

    results.querySelector('[data-command-index].active')?.scrollIntoView({ block: 'nearest' });
  }

  function recordRecent(id) {
    state.recents = [id, ...state.recents.filter(item => item !== id)].slice(0, 12);
    persist();
  }

  async function runCommand(id) {
    const command = state.commands.get(id);
    if (!command) return;
    recordRecent(id);
    close();
    try {
      await command.run();
      window.dispatchEvent(new CustomEvent('studio-command-ran', { detail: { id, title: command.title } }));
    } catch (error) {
      console.error(`Command failed: ${id}`, error);
      if (typeof window.showToast === 'function') {
        window.showToast(`Command failed: ${command.title}`, 'error');
      } else {
        alert(`Command failed: ${command.title}\n\n${error?.message || error}`);
      }
    }
  }

  function toggleFavourite(id) {
    if (state.favourites.has(id)) state.favourites.delete(id);
    else state.favourites.add(id);
    persist();
    refresh();
  }

  function open(initialQuery = '') {
    palette.hidden = false;
    document.body.classList.add('command-palette-open');
    input.value = initialQuery;
    state.activeIndex = 0;
    refresh();
    requestAnimationFrame(() => {
      input.focus();
      input.select();
    });
  }

  function close() {
    palette.hidden = true;
    document.body.classList.remove('command-palette-open');
  }

  function activateIndexed(index) {
    const command = state.filtered[index];
    if (command) runCommand(command.id);
  }

  function clickVisibleButton(matchers) {
    const buttons = [...document.querySelectorAll('button')];
    const button = buttons.find(candidate => {
      const text = normalise(candidate.innerText || candidate.textContent || candidate.getAttribute('aria-label'));
      return matchers.some(matcher => text.includes(normalise(matcher)));
    });
    if (!button) throw new Error(`Studio button not found: ${matchers[0]}`);
    button.click();
  }

  function navigate(page) {
    const button = document.querySelector(`[data-nav-page="${CSS.escape(page)}"]`);
    if (!button) throw new Error(`Studio page not found: ${page}`);
    button.click();
  }

  function autoRegisterVisibleActions() {
    const seenTitles = new Map();
    document.querySelectorAll('[data-page]').forEach(pagePanel => {
      const page = pagePanel.dataset.page;
      const navButton = document.querySelector(`[data-nav-page="${CSS.escape(page)}"]`);
      const pageTitle = (navButton?.innerText || page).replace(/\s+/g, ' ').trim();

      register({
        id: `navigate.${page}`,
        title: `Open ${pageTitle}`,
        category: 'Navigation',
        description: `Go to the ${pageTitle} page`,
        keywords: ['page', 'navigate', page],
        icon: '↗',
        run: () => navigate(page)
      });

      pagePanel.querySelectorAll('button').forEach((button, index) => {
        if (button.closest('#studioCommandPalette')) return;
        const title = (button.getAttribute('aria-label') || button.getAttribute('title') || button.innerText || button.textContent || '')
          .replace(/\s+/g, ' ').trim();
        if (!title || title.length < 2) return;
        if (/^(×|close|clear)$/i.test(title)) return;

        const duplicateCount = seenTitles.get(title) || 0;
        seenTitles.set(title, duplicateCount + 1);
        register({
          id: `ui.${page}.${button.id || index}.${duplicateCount}`,
          title,
          category: pageTitle,
          description: button.getAttribute('title') || '',
          keywords: [page, button.dataset.action || '', button.dataset.goPage || ''],
          icon: '⚡',
          run: () => {
            navigate(page);
            requestAnimationFrame(() => {
              button.scrollIntoView({ behavior: 'smooth', block: 'center' });
              button.focus({ preventScroll: true });
              button.click();
            });
          }
        });
      });
    });
  }

  // Curated aliases make natural searches useful even when button labels vary.
  function registerCuratedCommands() {
    const curated = [
      {
        id: 'curated.build-install',
        title: 'Build and install app',
        category: 'Build & Deploy',
        description: 'Build the Android app, install it and launch it',
        keywords: ['apk', 'android', 'phone', 'pixel', 'deploy', 'install'],
        icon: '📱',
        labels: ['Build + install app', 'Build and install', 'Build & install']
      },
      {
        id: 'curated.build-apk',
        title: 'Build APK only',
        category: 'Build & Deploy',
        description: 'Compile an Android APK without installing it',
        keywords: ['android', 'compile', 'debug', 'release'],
        icon: '📦',
        labels: ['Build APK only', 'Build APK']
      },
      {
        id: 'curated.refresh-brain',
        title: 'Refresh Project Brain',
        category: 'Project Brain',
        description: 'Rebuild the searchable project index',
        keywords: ['brain', 'index', 'manifest', 'scan', 'refresh'],
        icon: '🧠',
        labels: ['Refresh Project Brain', 'Build or refresh manifest', 'Refresh Brain']
      },
      {
        id: 'curated.run-doctor',
        title: 'Run Doctor',
        category: 'Diagnostics',
        description: 'Run the Studio project doctor',
        keywords: ['health', 'diagnostics', 'repair', 'test'],
        icon: '🩺',
        labels: ['Run Doctor', 'Doctor']
      },
      {
        id: 'curated.run-health',
        title: 'Run full health check',
        category: 'Developer Centre',
        description: 'Test renderer, IPC, Project Brain, search and dependencies',
        keywords: ['diagnostics', 'health', 'developer', 'test'],
        icon: '✅',
        labels: ['Run full health check', 'Run health check']
      },
      {
        id: 'curated.export-ai',
        title: 'Export AI context',
        category: 'AI Workspace',
        description: 'Export the current AI development context',
        keywords: ['ai', 'workspace', 'handover', 'context', 'export'],
        icon: '🤖',
        labels: ['Export AI context', 'Export AI Workspace']
      },
      {
        id: 'curated.validate-ai',
        title: 'Validate AI Workspace',
        category: 'AI Workspace',
        description: 'Check required AI knowledge and system files',
        keywords: ['ai', 'validate', 'knowledge', 'workspace'],
        icon: '✓',
        labels: ['Validate AI Workspace']
      }
    ];

    curated.forEach(item => register({
      id: item.id,
      title: item.title,
      category: item.category,
      description: item.description,
      keywords: item.keywords,
      icon: item.icon,
      run: () => clickVisibleButton(item.labels)
    }));
  }

  input.addEventListener('input', refresh);
  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      state.activeIndex = Math.min(state.activeIndex + 1, state.filtered.length - 1);
      render(normalise(input.value));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      state.activeIndex = Math.max(state.activeIndex - 1, 0);
      render(normalise(input.value));
    } else if (event.key === 'Enter') {
      event.preventDefault();
      activateIndexed(state.activeIndex);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      close();
    }
  });

  results.addEventListener('click', event => {
    const favourite = event.target.closest('[data-command-favourite]');
    if (favourite) {
      toggleFavourite(favourite.dataset.commandFavourite);
      return;
    }
    const run = event.target.closest('[data-command-run]');
    if (run) runCommand(run.dataset.commandRun);
  });

  closeButton.addEventListener('click', close);
  palette.addEventListener('mousedown', event => {
    if (event.target === palette) close();
  });

  document.addEventListener('keydown', event => {
    const key = event.key.toLowerCase();
    if ((event.ctrlKey || event.metaKey) && event.shiftKey && key === 'p') {
      event.preventDefault();
      open();
    } else if ((event.ctrlKey || event.metaKey) && key === 'k') {
      event.preventDefault();
      open();
    }
  });

  loadPersisted();
  autoRegisterVisibleActions();
  registerCuratedCommands();

  window.studioCommands = {
    register,
    unregister,
    open,
    close,
    run: runCommand,
    list: () => [...state.commands.values()].map(command => ({ ...command, run: undefined })),
    rebuildFromUi: () => {
      state.commands.clear();
      autoRegisterVisibleActions();
      registerCuratedCommands();
      refresh();
    },
    getState: () => ({
      commands: state.commands.size,
      favourites: [...state.favourites],
      recents: [...state.recents]
    })
  };
})();