/* FriendshipTree Studio 2.12.0
 * Universal Search Engine
 *
 * One shared index powers:
 * - the top Studio result palette;
 * - live sidebar match counts;
 * - cross-page section/button highlighting;
 * - Project Brain filename results;
 * - keyboard navigation.
 */
(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const state = {
    staticItems: [],
    brainItems: [],
    query: '',
    tokens: [],
    results: [],
    activeIndex: -1,
    requestSerial: 0,
    debounceTimer: null,
    lastPageCounts: new Map()
  };

  const input = $('studioGlobalSearchInput');
  const panel = $('studioUniversalSearchResults');
  const clearButton = $('clearStudioGlobalSearch');
  if (!input || !panel) return;

  function normalise(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^\p{L}\p{N}._:/\\-]+/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function visibleLabel(element) {
    const clone = element.cloneNode(true);
    clone.querySelectorAll('.universal-search-badge, script, style').forEach(node => node.remove());
    return String(clone.innerText || clone.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function pageTitle(page) {
    const nav = document.querySelector(`[data-nav-page="${CSS.escape(page)}"]`);
    return visibleLabel(nav) || page.replace(/(^|-)(\w)/g, (_, __, char) => ` ${char.toUpperCase()}`).trim();
  }

  function identifySection(element, panelElement) {
    let current = element;
    while (current && current !== panelElement) {
      const title = current.querySelector?.(':scope > h2, :scope > h3, :scope > .card-kicker, :scope > summary');
      if (title) return visibleLabel(title);
      current = current.parentElement;
    }
    const heading = panelElement.querySelector('h2, h3');
    return heading ? visibleLabel(heading) : pageTitle(panelElement.dataset.page || 'home');
  }

  function describeElement(element) {
    const explicit = element.getAttribute('aria-label') || element.getAttribute('title') || '';
    const text = visibleLabel(element);
    return (explicit && !text.toLowerCase().includes(explicit.toLowerCase()))
      ? `${text} ${explicit}`.trim()
      : text;
  }

  function itemKind(element) {
    if (element.matches('button, [role="button"]')) return 'Action';
    if (element.matches('input, select, textarea')) return 'Control';
    if (element.matches('details')) return 'Section';
    if (element.matches('article, .status-box, .panel')) return 'Section';
    return 'Content';
  }

  function scoreText(item, query, tokens) {
    const title = normalise(item.title);
    const section = normalise(item.section);
    const haystack = normalise(`${item.title} ${item.section} ${item.description} ${item.keywords || ''} ${item.path || ''}`);
    if (!tokens.every(token => haystack.includes(token))) return 0;

    let score = 10;
    if (title === query) score += 120;
    if (title.startsWith(query)) score += 80;
    if (title.includes(query)) score += 55;
    if (normalise(item.path || '').includes(query)) score += 48;
    if (section === query) score += 35;
    if (section.includes(query)) score += 22;
    score += Math.max(0, 20 - title.length / 8);
    if (item.kind === 'File') score += 12;
    if (item.kind === 'Action') score += 8;
    return score;
  }

  function buildStaticIndex() {
    const items = [];
    const seen = new Set();

    document.querySelectorAll('[data-page]').forEach(pagePanel => {
      const page = pagePanel.dataset.page;
      const pTitle = pageTitle(page);
      const pageKey = `page:${page}`;
      items.push({
        id: pageKey, page, pageTitle: pTitle, section: pTitle,
        title: pTitle, description: pagePanel.textContent || '',
        kind: 'Page', element: pagePanel
      });
      seen.add(pageKey);

      const candidates = pagePanel.querySelectorAll(
        'button, [role="button"], article, details, .status-box, .brain-result-row, .brain-relation-row, .brain-table-row, h2, h3, label'
      );
      candidates.forEach((element, index) => {
        if (element.closest('.universal-search-results')) return;
        const title = describeElement(element);
        if (!title || title.length < 2) return;
        const section = identifySection(element, pagePanel);
        const id = `${page}:${element.id || element.dataset.action || element.dataset.goPage || element.tagName}:${index}:${title.slice(0, 40)}`;
        if (seen.has(id)) return;
        seen.add(id);
        items.push({
          id, page, pageTitle: pTitle, section,
          title, description: element.getAttribute('title') || element.getAttribute('aria-label') || '',
          keywords: element.dataset.searchKeywords || '',
          kind: itemKind(element), element
        });
      });
    });

    state.staticItems = items;
  }

  async function searchBrain(query, serial) {
    if (query.length < 2 || typeof window.studio?.searchProjectBrain !== 'function') {
      state.brainItems = [];
      return;
    }
    try {
      const response = await window.studio.searchProjectBrain(query, 'search', 40);
      if (serial !== state.requestSerial) return;
      const rows = Array.isArray(response?.results) ? response.results : [];
      state.brainItems = rows
        .filter(row => row && row.path)
        .map((row, index) => ({
          id: `brain:${row.path}:${index}`,
          page: 'brain',
          pageTitle: pageTitle('brain'),
          section: 'Project files',
          title: row.name || row.path.split(/[\\/]/).pop(),
          description: row.path,
          path: row.path,
          keywords: `${row.owner || ''} ${row.state || ''}`,
          kind: 'File',
          scoreBoost: Number(row.score || 0)
        }));
    } catch {
      if (serial === state.requestSerial) state.brainItems = [];
    }
  }

  function resultGroups(results) {
    const groups = new Map();
    results.forEach(item => {
      const key = item.page;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(item);
    });
    return [...groups.entries()];
  }

  function applySidebarCounts(results) {
    const counts = new Map();
    results.forEach(item => counts.set(item.page, (counts.get(item.page) || 0) + 1));
    state.lastPageCounts = counts;

    document.querySelectorAll('[data-nav-page]').forEach(button => {
      let badge = button.querySelector('.universal-search-badge');
      const count = counts.get(button.dataset.navPage) || 0;
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'universal-search-badge';
        button.appendChild(badge);
      }
      badge.textContent = count ? String(count) : '';
      badge.hidden = !state.query || !count;
      button.classList.toggle('universal-page-has-results', Boolean(state.query && count));
      button.classList.toggle('universal-page-no-results', Boolean(state.query && !count));
    });
  }

  function clearHighlights() {
    document.querySelectorAll('.universal-search-match, .universal-search-context').forEach(element => {
      element.classList.remove('universal-search-match', 'universal-search-context');
    });
  }

  function highlightActivePage() {
    clearHighlights();
    if (!state.query) return;
    const activePage = document.body.dataset.activePage;
    state.results
      .filter(item => item.page === activePage && item.element)
      .forEach(item => {
        item.element.classList.add('universal-search-match');
        let parent = item.element.parentElement;
        while (parent && !parent.matches('[data-page]')) {
          if (parent.matches('article, details, .panel, .status-box')) parent.classList.add('universal-search-context');
          if (parent.matches('details')) parent.open = true;
          parent = parent.parentElement;
        }
      });
  }

  function setActiveResult(index) {
    const buttons = [...panel.querySelectorAll('[data-universal-result-index]')];
    if (!buttons.length) {
      state.activeIndex = -1;
      return;
    }
    state.activeIndex = Math.max(0, Math.min(index, buttons.length - 1));
    buttons.forEach((button, i) => button.classList.toggle('active', i === state.activeIndex));
    buttons[state.activeIndex]?.scrollIntoView({ block: 'nearest' });
  }

  function render() {
    applySidebarCounts(state.results);
    highlightActivePage();
    clearButton?.classList.toggle('visible', Boolean(state.query));

    if (!state.query) {
      panel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      panel.innerHTML = '';
      return;
    }

    const groups = resultGroups(state.results.slice(0, 80));
    if (!groups.length) {
      panel.innerHTML = `<div class="universal-search-empty"><b>No Studio matches</b><span>Nothing indexed contains “${escapeHtml(state.query)}”.</span></div>`;
    } else {
      let globalIndex = 0;
      panel.innerHTML = groups.map(([page, items]) => `
        <section class="universal-search-group">
          <header>
            <span>${escapeHtml(items[0].pageTitle)}</span>
            <b>${state.lastPageCounts.get(page) || items.length}</b>
          </header>
          ${items.slice(0, 12).map(item => {
            const index = globalIndex++;
            return `<button type="button" role="option" data-universal-result-index="${index}" data-result-id="${escapeHtml(item.id)}">
              <span class="universal-result-kind">${escapeHtml(item.kind)}</span>
              <span class="universal-result-copy">
                <b>${escapeHtml(item.title)}</b>
                <small>${escapeHtml(item.pageTitle)} → ${escapeHtml(item.section)}${item.path ? ` → ${escapeHtml(item.path)}` : ''}</small>
              </span>
            </button>`;
          }).join('')}
        </section>`).join('');
    }

    panel.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    state.activeIndex = -1;
  }

  async function runSearch(rawQuery) {
    const query = normalise(rawQuery);
    state.query = query;
    state.tokens = query.split(' ').filter(Boolean);
    state.requestSerial += 1;
    const serial = state.requestSerial;

    if (!query) {
      state.results = [];
      state.brainItems = [];
      render();
      return;
    }

    if (!state.staticItems.length) buildStaticIndex();

    const staticRanked = state.staticItems
      .map(item => ({ ...item, score: scoreText(item, query, state.tokens) }))
      .filter(item => item.score > 0);

    // Render the local Studio index immediately, then merge Project Brain results.
    state.results = staticRanked.sort((a, b) => b.score - a.score);
    render();

    await searchBrain(query, serial);
    if (serial !== state.requestSerial) return;

    const brainRanked = state.brainItems
      .map(item => ({ ...item, score: scoreText(item, query, state.tokens) + (item.scoreBoost || 0) }))
      .filter(item => item.score > 0);

    const unique = new Map();
    [...staticRanked, ...brainRanked].forEach(item => {
      const key = item.path ? `path:${item.path}` : item.id;
      const previous = unique.get(key);
      if (!previous || item.score > previous.score) unique.set(key, item);
    });
    state.results = [...unique.values()].sort((a, b) => b.score - a.score);
    render();
  }

  function queueSearch() {
    clearTimeout(state.debounceTimer);
    state.debounceTimer = setTimeout(() => runSearch(input.value), 90);
  }

  function activateResult(item) {
    if (!item) return;
    if (typeof window.switchStudioPage === 'function') {
      window.switchStudioPage(item.page);
    } else {
      document.querySelector(`[data-nav-page="${CSS.escape(item.page)}"]`)?.click();
    }

    requestAnimationFrame(() => {
      if (item.path && typeof window.loadBrainFile === 'function') {
        window.loadBrainFile(item.path);
      } else if (item.element) {
        if (item.element.matches('details')) item.element.open = true;
        item.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        item.element.classList.add('universal-search-flash');
        setTimeout(() => item.element?.classList.remove('universal-search-flash'), 1400);
        if (item.kind === 'Action' && item.element.matches('button')) item.element.focus({ preventScroll: true });
      }
      highlightActivePage();
    });

    panel.hidden = true;
    input.setAttribute('aria-expanded', 'false');
  }

  panel.addEventListener('mousedown', event => event.preventDefault());
  panel.addEventListener('click', event => {
    const button = event.target.closest('[data-result-id]');
    if (!button) return;
    const item = state.results.find(result => result.id === button.dataset.resultId);
    activateResult(item);
  });

  input.addEventListener('input', queueSearch);
  input.addEventListener('focus', () => {
    if (state.query) render();
  });
  input.addEventListener('keydown', event => {
    const resultButtons = panel.querySelectorAll('[data-universal-result-index]');
    if (event.key === 'ArrowDown' && resultButtons.length) {
      event.preventDefault();
      setActiveResult(state.activeIndex + 1);
    } else if (event.key === 'ArrowUp' && resultButtons.length) {
      event.preventDefault();
      setActiveResult(state.activeIndex <= 0 ? resultButtons.length - 1 : state.activeIndex - 1);
    } else if (event.key === 'Enter' && state.activeIndex >= 0) {
      event.preventDefault();
      resultButtons[state.activeIndex]?.click();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      if (!panel.hidden) {
        panel.hidden = true;
        input.setAttribute('aria-expanded', 'false');
      } else {
        clear();
      }
    }
  });

  document.addEventListener('click', event => {
    if (!event.target.closest('.universal-search-shell')) {
      panel.hidden = true;
      input.setAttribute('aria-expanded', 'false');
    }
  });

  document.querySelectorAll('[data-nav-page]').forEach(button => {
    button.addEventListener('click', () => requestAnimationFrame(highlightActivePage));
  });

  function clear() {
    clearTimeout(state.debounceTimer);
    state.query = '';
    state.tokens = [];
    state.results = [];
    state.brainItems = [];
    input.value = '';
    render();
    clearHighlights();
  }

  // Ctrl+K focuses the same universal engine instead of creating a second search system.
  document.addEventListener('keydown', event => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      input.focus();
      input.select();
      if (state.query) render();
    }
  });

  window.universalStudioSearch = {
    search: runSearch,
    clear,
    rebuildIndex: buildStaticIndex,
    highlightActivePage,
    getState: () => ({
      query: state.query,
      staticItems: state.staticItems.length,
      brainItems: state.brainItems.length,
      results: state.results.length,
      pageCounts: Object.fromEntries(state.lastPageCounts)
    })
  };

  buildStaticIndex();
})();