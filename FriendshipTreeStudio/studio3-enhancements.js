(() => {
  'use strict';
  if (window.__friendshipTreeStudio3Loaded) return;
  window.__friendshipTreeStudio3Loaded = true;

  const state = {
    commands: [],
    fileCommands: [],
    selectedIndex: 0,
    history: JSON.parse(localStorage.getItem('ft-studio-action-history') || '[]').slice(0, 100),
    activeAction: null,
    fileIndexLoaded: false
  };
  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const normalise = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const now = () => new Date();
  const timeText = d => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  function injectUi() {
    const shell = document.createElement('div');
    shell.id = 'studio3Shell';
    shell.innerHTML = `
      <div id="studio3Dashboard" class="s3-dashboard">
        <div class="s3-dashboard-title"><div><strong>FriendshipTree Studio</strong><span>Developer dashboard</span></div><button id="s3CollapseDashboard" title="Collapse dashboard">−</button></div>
        <div class="s3-status-grid">
          <button class="s3-status-card" data-s3-command="project health"><span>Project health</span><strong id="s3Health">Checking…</strong></button>
          <button class="s3-status-card" data-s3-command="manifest"><span>Manifest</span><strong id="s3Manifest">Unknown</strong></button>
          <button class="s3-status-card" data-s3-command="dependency"><span>Dependencies</span><strong id="s3Dependencies">Unknown</strong></button>
          <button class="s3-status-card" data-s3-command="android"><span>Android</span><strong id="s3Android">Check devices</strong></button>
          <button class="s3-status-card" data-s3-command="recovery backup restore rollback"><span>Recovery</span><strong id="s3Recovery">Available</strong></button>
          <button class="s3-status-card" data-s3-command="ai package"><span>AI workspace</span><strong id="s3AI">Open tools</strong></button>
        </div>
        <div id="s3Suggestion" class="s3-suggestion">Suggested next action: refresh the dashboard.</div>
      </div>
      <div id="studio3Palette" class="s3-palette" hidden>
        <div class="s3-palette-box">
          <div class="s3-search-row"><span>⌕</span><input id="s3Search" autocomplete="off" placeholder="Search tools, actions, reports and project files…"><kbd>Esc</kbd></div>
          <div id="s3Results" class="s3-results"></div>
          <div class="s3-palette-footer"><span>↑↓ navigate</span><span>Enter open</span><span>Ctrl+K search</span></div>
        </div>
      </div>
      <aside id="studio3HistoryPanel" class="s3-history-panel" hidden>
        <div class="s3-history-head"><strong>Action history</strong><button id="s3CloseHistory">×</button></div>
        <div id="s3HistoryList"></div>
        <button id="s3ClearHistory" class="s3-clear-history">Clear history</button>
      </aside>
      <div id="studio3ActionToast" class="s3-action-toast" hidden></div>
      <footer id="studio3StatusBar" class="s3-statusbar">
        <button id="s3OpenPalette">⌕ Search <kbd>Ctrl+K</kbd></button>
        <span id="s3CurrentAction">Ready</span>
        <span class="s3-spacer"></span>
        <button id="s3HistoryButton">History <span id="s3HistoryCount">0</span></button>
        <span id="s3Clock"></span>
      </footer>`;
    document.body.appendChild(shell);
    document.body.classList.add('studio3-active');

    $('s3OpenPalette').onclick = openPalette;
    $('s3HistoryButton').onclick = () => { renderHistory(); $('studio3HistoryPanel').hidden = false; };
    $('s3CloseHistory').onclick = () => $('studio3HistoryPanel').hidden = true;
    $('s3ClearHistory').onclick = () => { state.history = []; persistHistory(); renderHistory(); };
    $('s3CollapseDashboard').onclick = () => {
      $('studio3Dashboard').classList.toggle('collapsed');
      $('s3CollapseDashboard').textContent = $('studio3Dashboard').classList.contains('collapsed') ? '+' : '−';
    };
    document.querySelectorAll('[data-s3-command]').forEach(button => button.onclick = () => openPalette(button.dataset.s3Command));
    $('studio3Palette').addEventListener('click', e => { if (e.target === $('studio3Palette')) closePalette(); });
    setInterval(() => { $('s3Clock').textContent = timeText(now()); }, 1000);
    $('s3Clock').textContent = timeText(now());
  }

  function buildRegistry() {
    const commands = [];
    const seen = new Set();
    document.querySelectorAll('button, [role="button"]').forEach((button, index) => {
      if (button.closest('#studio3Shell')) return;
      const label = (button.innerText || button.getAttribute('aria-label') || button.title || '').trim();
      if (!label || label.length > 120) return;
      const panel = button.closest('section, article, .panel, main > div');
      const heading = panel?.querySelector('h1,h2,h3,strong')?.textContent?.trim() || 'Studio';
      const id = button.id || button.dataset.action || `button-${index}`;
      const key = `${normalise(label)}|${normalise(heading)}`;
      if (seen.has(key)) return;
      seen.add(key);
      commands.push({
        id: `tool:${id}`,
        type: 'Tool',
        title: label,
        subtitle: heading,
        keywords: normalise(`${label} ${heading} ${button.id} ${button.dataset.action || ''} ${/recovery|restore|rollback|quarantine/i.test(label + ' ' + heading) ? 'backup backups recovery restore rollback' : ''}`),
        target: button,
        run: () => activateTarget(button)
      });
    });
    document.querySelectorAll('section, .panel').forEach((panel, index) => {
      const heading = panel.querySelector('h1,h2,h3')?.textContent?.trim();
      if (!heading) return;
      commands.push({
        id: `section:${index}`,
        type: 'Section',
        title: heading,
        subtitle: 'Open Studio section',
        keywords: normalise(`${heading} section page panel`),
        target: panel,
        run: () => activateTarget(panel, false)
      });
    });
    state.commands = commands;
  }

  async function loadFileIndex() {
    if (state.fileIndexLoaded || !window.studio?.getExplorer) return;
    state.fileIndexLoaded = true;
    try {
      const data = await window.studio.getExplorer();
      const flatten = (items, output = []) => {
        for (const item of items || []) {
          if (item.path || item.relativePath) output.push(item);
          if (item.children) flatten(item.children, output);
        }
        return output;
      };
      const files = Array.isArray(data) ? flatten(data) : flatten(data?.items || data?.tree || []);
      state.fileCommands = files.slice(0, 5000).map((file, index) => {
        const path = file.path || file.relativePath || file.name;
        return {
          id: `file:${index}`,
          type: 'File',
          title: file.name || path.split(/[\\/]/).pop(),
          subtitle: path,
          keywords: normalise(path),
          run: () => {
            closePalette();
            if (window.studio?.openPath) window.studio.openPath(path);
          }
        };
      });
    } catch (error) {
      addHistory('Load project file index', 'failed', error.message);
    }
  }

  function score(command, query) {
    if (!query) return command.type === 'Tool' ? 20 : 5;
    const q = normalise(query);
    const title = normalise(command.title);
    const haystack = command.keywords || normalise(`${command.title} ${command.subtitle}`);
    if (title === q) return 100;
    if (title.startsWith(q)) return 80;
    if (title.includes(q)) return 65;
    const words = q.split(' ').filter(Boolean);
    if (words.every(word => haystack.includes(word))) return 45 + words.length;
    let fuzzy = 0, cursor = 0;
    for (const char of q.replaceAll(' ', '')) {
      const found = haystack.indexOf(char, cursor);
      if (found < 0) return 0;
      fuzzy += found === cursor ? 2 : 1;
      cursor = found + 1;
    }
    return fuzzy;
  }

  function searchCommands(query) {
    return [...state.commands, ...state.fileCommands]
      .map(command => ({ command, score: score(command, query) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score || a.command.title.localeCompare(b.command.title))
      .slice(0, 30)
      .map(item => item.command);
  }

  function renderResults() {
    const query = $('s3Search').value;
    const results = searchCommands(query);
    state.currentResults = results;
    state.selectedIndex = Math.min(state.selectedIndex, Math.max(0, results.length - 1));
    const grouped = results.map((item, index) => `
      <button class="s3-result ${index === state.selectedIndex ? 'selected' : ''}" data-index="${index}">
        <span class="s3-result-type">${esc(item.type)}</span>
        <span class="s3-result-copy"><strong>${esc(item.title)}</strong><small>${esc(item.subtitle)}</small></span>
        <span class="s3-result-arrow">↵</span>
      </button>`).join('');
    $('s3Results').innerHTML = grouped || '<div class="s3-no-results">No matching Studio tools or files.</div>';
    $('s3Results').querySelectorAll('.s3-result').forEach(button => {
      button.onmouseenter = () => { state.selectedIndex = Number(button.dataset.index); renderResults(); };
      button.onclick = () => runSelected(Number(button.dataset.index));
    });
  }

  function openPalette(initial = '') {
    $('studio3Palette').hidden = false;
    $('s3Search').value = initial;
    state.selectedIndex = 0;
    renderResults();
    requestAnimationFrame(() => { $('s3Search').focus(); $('s3Search').select(); });
    loadFileIndex().then(renderResults);
  }
  function closePalette() { $('studio3Palette').hidden = true; }
  function runSelected(index = state.selectedIndex) {
    const command = state.currentResults?.[index];
    if (!command) return;
    closePalette();
    command.run();
  }

  function activateTarget(target, click = true) {
    const sidebarTarget = target.closest('[data-page], [data-section]');
    if (sidebarTarget?.dataset.page) {
      document.querySelector(`[data-page-target="${CSS.escape(sidebarTarget.dataset.page)}"]`)?.click();
    }
    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add('s3-highlight');
    setTimeout(() => target.classList.remove('s3-highlight'), 1800);
    if (click && target instanceof HTMLButtonElement && !target.disabled) {
      setTimeout(() => target.click(), 350);
    }
  }

  function persistHistory() {
    localStorage.setItem('ft-studio-action-history', JSON.stringify(state.history.slice(0, 100)));
    $('s3HistoryCount').textContent = state.history.length;
  }
  function addHistory(name, status, detail = '', duration = null) {
    state.history.unshift({ id: Date.now(), name, status, detail, duration, at: new Date().toISOString() });
    state.history = state.history.slice(0, 100);
    persistHistory();
    renderHistory();
  }
  function renderHistory() {
    $('s3HistoryList').innerHTML = state.history.map(item => `
      <article class="s3-history-item ${esc(item.status)}">
        <span class="s3-history-icon">${item.status === 'success' ? '✓' : item.status === 'failed' ? '✕' : '•'}</span>
        <div><strong>${esc(item.name)}</strong><small>${timeText(new Date(item.at))}${item.duration != null ? ` · ${item.duration.toFixed(1)}s` : ''}</small>${item.detail ? `<p>${esc(item.detail)}</p>` : ''}</div>
      </article>`).join('') || '<p class="s3-empty">No actions recorded yet.</p>';
  }

  function beginAction(button) {
    if (!button || button.closest('#studio3Shell') || button.disabled) return;
    const name = (button.innerText || button.title || button.id || 'Studio action').trim();
    const token = { button, name, started: performance.now(), settled: false };
    state.activeAction = token;
    $('s3CurrentAction').textContent = `⟳ ${name}`;
    showToast('running', name, 'Running…');
    button.classList.add('s3-running');
    const panel = button.closest('section,.panel,article') || document.body;
    const observer = new MutationObserver(() => {
      const text = panel.innerText.toLowerCase();
      if (/failed|error|enoent|exception|unable to|invalid/.test(text.slice(-1500))) settleAction(token, 'failed', 'The action reported an error.');
      else if (/complete|completed|success|ready|built|exported|installed|connected|calculated|indexed/.test(text.slice(-1500))) settleAction(token, 'success');
    });
    observer.observe(panel, { childList: true, subtree: true, characterData: true });
    token.observer = observer;
    setTimeout(() => { if (!token.settled) settleAction(token, 'success', 'Action returned control to Studio.'); }, 12000);
  }
  function settleAction(token, status, detail = '') {
    if (!token || token.settled) return;
    token.settled = true;
    token.observer?.disconnect();
    token.button?.classList.remove('s3-running');
    const duration = (performance.now() - token.started) / 1000;
    $('s3CurrentAction').textContent = `${status === 'success' ? '✓' : '✕'} ${token.name}`;
    showToast(status, token.name, status === 'success' ? `Completed in ${duration.toFixed(1)}s` : detail || 'Failed');
    addHistory(token.name, status, detail, duration);
    setTimeout(() => { if (state.activeAction === token) $('s3CurrentAction').textContent = 'Ready'; }, 5000);
    refreshDashboardFromPage();
  }
  function showToast(status, title, detail) {
    const toast = $('studio3ActionToast');
    toast.className = `s3-action-toast ${status}`;
    toast.innerHTML = `<strong>${esc(title)}</strong><span>${esc(detail)}</span>`;
    toast.hidden = false;
    clearTimeout(showToast.timer);
    showToast.timer = setTimeout(() => { toast.hidden = true; }, status === 'failed' ? 9000 : 3500);
  }

  function refreshDashboardFromPage() {
    const page = document.body.innerText;
    const healthMatch = page.match(/(?:health|score)[^\d]{0,20}(\d{1,3})\s*(?:\/\s*100|%)/i);
    if (healthMatch) $('s3Health').textContent = `${healthMatch[1]} / 100`;
    const manifestText = $('manifestSummary')?.innerText || '';
    if (manifestText.trim()) $('s3Manifest').textContent = /error|failed/i.test(manifestText) ? 'Needs attention' : 'Available';
    const graphText = $('graph')?.innerText || '';
    const graphMatch = graphText.match(/(\d+)\s+source files/i);
    if (graphMatch) $('s3Dependencies').textContent = `${graphMatch[1]} files`;
    const recoveryText = $('recovery')?.innerText || '';
    const recoveryCount = recoveryText.match(/(\d+)\s+(?:recovery|transaction|backup)/i);
    if (recoveryCount) $('s3Recovery').textContent = `${recoveryCount[1]} points`;
    const aiText = $('aiStatus')?.innerText || '';
    if (aiText.trim()) $('s3AI').textContent = /error|failed/i.test(aiText) ? 'Needs attention' : 'Available';
    const suggestion = healthMatch && Number(healthMatch[1]) < 90 ? 'Suggested next action: open Project Health and review its problems.'
      : graphText && /unresolved/i.test(graphText) ? 'Suggested next action: review unresolved dependencies.'
      : 'Suggested next action: create an AI Sync package before the next app change.';
    $('s3Suggestion').textContent = suggestion;
  }

  function bindEvents() {
    document.addEventListener('keydown', event => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); openPalette(); return; }
      if ($('studio3Palette').hidden) return;
      if (event.key === 'Escape') { closePalette(); return; }
      if (event.key === 'ArrowDown') { event.preventDefault(); state.selectedIndex = Math.min((state.currentResults?.length || 1) - 1, state.selectedIndex + 1); renderResults(); }
      if (event.key === 'ArrowUp') { event.preventDefault(); state.selectedIndex = Math.max(0, state.selectedIndex - 1); renderResults(); }
      if (event.key === 'Enter') { event.preventDefault(); runSelected(); }
    });
    $('s3Search').addEventListener('input', () => { state.selectedIndex = 0; renderResults(); });
    document.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (button) beginAction(button);
    }, true);
    window.addEventListener('unhandledrejection', event => {
      const detail = event.reason?.message || String(event.reason || 'Unhandled error');
      if (state.activeAction && !state.activeAction.settled) settleAction(state.activeAction, 'failed', detail);
      else addHistory('Studio background action', 'failed', detail);
      showToast('failed', 'Studio action failed', detail);
    });
    window.addEventListener('error', event => {
      const detail = `${event.message}${event.lineno ? ` (line ${event.lineno})` : ''}`;
      if (state.activeAction && !state.activeAction.settled) settleAction(state.activeAction, 'failed', detail);
      showToast('failed', 'Studio error', detail);
    });
    const registryObserver = new MutationObserver(() => {
      clearTimeout(registryObserver.timer);
      registryObserver.timer = setTimeout(() => { buildRegistry(); refreshDashboardFromPage(); }, 250);
    });
    registryObserver.observe(document.body, { childList: true, subtree: true });
  }

  function init() {
    injectUi();
    buildRegistry();
    bindEvents();
    renderHistory();
    persistHistory();
    refreshDashboardFromPage();
    setTimeout(refreshDashboardFromPage, 2000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
