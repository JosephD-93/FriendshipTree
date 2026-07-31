(() => {
  'use strict';
  if (window.FriendshipTreeStudioSelfTest) return;

  const tests = new Map();
  const results = [];
  const discovered = { buttons: [], sections: [], searches: [] };
  let running = false;
  let lastReport = null;

  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const normalise = value => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  const visible = el => !!(el && (el.offsetWidth || el.offsetHeight || el.getClientRects().length));
  const textOf = el => (el?.innerText || el?.textContent || el?.getAttribute?.('aria-label') || el?.title || '').trim();
  const destructive = /delete|remove|trash|uninstall|rollback|restore|apply update|install|accept tested|quarantine|clear|reset|overwrite|move files|clean/i;
  const safeAction = /manifest|dependency graph|health score|calculate health|refresh manifest|diagnostic|status|check device/i;

  function register(definition) {
    if (!definition || typeof definition !== 'object') throw new TypeError('Self-test definition must be an object.');
    if (!definition.id || !definition.name || typeof definition.run !== 'function') {
      throw new TypeError('Self-test requires id, name and run.');
    }
    tests.set(definition.id, {
      category: 'Feature',
      timeoutMs: 15000,
      safe: true,
      version: '1',
      ...definition
    });
    refreshTestCount();
    return () => tests.delete(definition.id);
  }

  function unregister(id) { tests.delete(id); refreshTestCount(); }

  function discover() {
    discovered.buttons = [...document.querySelectorAll('button, [role="button"]')]
      .filter(el => !el.closest('#ftSelfTestShell'))
      .map((el, index) => ({
        id: el.id || el.dataset.action || `button-${index}`,
        label: textOf(el) || '(unlabelled button)',
        visible: visible(el),
        disabled: !!el.disabled,
        destructive: destructive.test(textOf(el)),
        hasInlineHandler: typeof el.onclick === 'function'
      }));
    discovered.sections = [...document.querySelectorAll('section, article, .panel, [data-page], [data-section]')]
      .filter(el => !el.closest('#ftSelfTestShell'))
      .map((el, index) => ({ id: el.id || `section-${index}`, label: textOf(el.querySelector('h1,h2,h3,strong')) || '(unnamed section)', visible: visible(el) }));
    discovered.searches = [...document.querySelectorAll('input[type="search"], input[placeholder*="search" i], input[id*="search" i], input[id*="finder" i]')]
      .filter(el => !el.closest('#ftSelfTestShell'))
      .map(el => ({ id: el.id, placeholder: el.placeholder, visible: visible(el) }));
    return discovered;
  }

  async function runWithTimeout(test, context) {
    const timeoutMs = Number(test.timeoutMs || 15000);
    let timer;
    try {
      const value = await Promise.race([
        Promise.resolve(test.run(context)),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs} ms`)), timeoutMs); })
      ]);
      clearTimeout(timer);
      if (value === false) return { status: 'failed', detail: 'Test returned false.' };
      if (value && typeof value === 'object' && value.status) return value;
      return { status: 'passed', detail: typeof value === 'string' ? value : 'Passed.' };
    } catch (error) {
      clearTimeout(timer);
      return { status: 'failed', detail: error?.stack || error?.message || String(error) };
    }
  }

  let backendSafetyReportPromise = null;

  async function getBackendSafetyReport() {
    if (!backendSafetyReportPromise) {
      backendSafetyReportPromise = (async () => {
        if (!window.studio || typeof window.studio.runSelfTests !== 'function') {
          throw new Error('Backend safety-test API is unavailable.');
        }
        const report = await window.studio.runSelfTests();
        if (!report || !Array.isArray(report.results)) {
          throw new Error('Backend safety tests returned an invalid report.');
        }
        return report;
      })();
    }
    return backendSafetyReportPromise;
  }

  function registerBackendSafetyTests() {
    const expected = [
      'Reject path traversal',
      'Reject package without files',
      'Reject invalid SHA-256',
      'Dependency graph returns a structured result',
      'Cleaner dry run does not move files',
      'Project health score is bounded',
      'Quarantine hashing works inside excluded .studio path'
    ];
    for (const name of expected) {
      register({
        id: `backend.${normalise(name).replace(/ /g, '-')}`,
        name,
        category: 'Backend Safety',
        timeoutMs: 30000,
        run: async () => {
          const report = await getBackendSafetyReport();
          const result = report.results.find(item => item && item.name === name);
          if (!result) throw new Error(`Backend report omitted required test: ${name}`);
          if (!result.ok) throw new Error(result.message || 'Backend safety test failed.');
          return `Passed in backend suite. Report: ${report.reportPath || 'saved by Studio'}`;
        }
      });
    }
  }

  function builtInTests() {
    registerBackendSafetyTests();
    register({ id:'core.dom', name:'Interface loads', category:'Core', run:() => {
      if (!document.body || document.body.children.length < 2) throw new Error('Studio body did not load.');
      return `${document.body.children.length} top-level elements loaded.`;
    }});
    register({ id:'core.duplicate-ids', name:'No duplicate element IDs', category:'Core', run:() => {
      const ids = [...document.querySelectorAll('[id]')].map(el => el.id).filter(Boolean);
      const duplicates = [...new Set(ids.filter((id, i) => ids.indexOf(id) !== i))];
      return duplicates.length ? { status:'failed', detail:`Duplicate IDs: ${duplicates.join(', ')}` } : `${ids.length} unique IDs checked.`;
    }});
    register({ id:'navigation.inventory', name:'Navigation inventory', category:'Navigation', run:() => {
      const nav = [...document.querySelectorAll('nav button, aside button, [data-page-target], [data-section-target]')].filter(el => !el.closest('#ftSelfTestShell'));
      if (!nav.length) return { status:'warning', detail:'No navigation controls were identifiable.' };
      const disabled = nav.filter(el => el.disabled).map(textOf);
      return disabled.length ? { status:'warning', detail:`${nav.length} found; disabled: ${disabled.join(', ')}` } : `${nav.length} navigation controls found and enabled.`;
    }});
    register({ id:'navigation.smoke', name:'Sidebar navigation smoke test', category:'Navigation', timeoutMs:20000, run:async() => {
      const nav = [...document.querySelectorAll('nav button, .sidebar button, aside button')]
        .filter(el => !el.closest('#ftSelfTestShell') && visible(el) && !el.disabled)
        .filter(el => !/history|search|close|collapse/i.test(textOf(el)));
      if (!nav.length) return { status:'skipped', detail:'No safe sidebar buttons identified.' };
      const original = document.activeElement;
      const failures = [];
      for (const button of nav.slice(0, 30)) {
        try { button.click(); await wait(80); }
        catch (error) { failures.push(`${textOf(button)}: ${error.message}`); }
      }
      original?.focus?.();
      return failures.length ? { status:'failed', detail:failures.join('\n') } : `${Math.min(nav.length,30)} sidebar controls clicked without a JavaScript exception.`;
    }});
    register({ id:'search.inventory', name:'Search controls exist', category:'Search', run:() => {
      const found = discover().searches;
      if (!found.length) throw new Error('No search input was found.');
      return `${found.length} search input(s): ${found.map(x => x.id || x.placeholder || 'unnamed').join(', ')}`;
    }});
    register({ id:'search.input', name:'Search responds to input', category:'Search', timeoutMs:5000, run:async() => {
      const input = [...document.querySelectorAll('input[type="search"], input[placeholder*="search" i], input[id*="search" i], input[id*="finder" i]')]
        .find(el => !el.closest('#ftSelfTestShell') && visible(el));
      if (!input) return { status:'skipped', detail:'No visible search input.' };
      const previous = input.value;
      input.focus(); input.value = 'manifest'; input.dispatchEvent(new Event('input', { bubbles:true }));
      await wait(250);
      const possibleResults = [...document.querySelectorAll('[class*="result" i], [id*="result" i], [class*="suggest" i]')]
        .filter(el => !el.closest('#ftSelfTestShell') && visible(el) && /manifest/i.test(textOf(el)));
      input.value = previous; input.dispatchEvent(new Event('input', { bubbles:true }));
      return possibleResults.length ? `${possibleResults.length} matching result area(s) responded.` : { status:'warning', detail:'Input event fired, but no visible Manifest result could be verified automatically.' };
    }});
    register({ id:'search.ctrl-k', name:'Ctrl+K command palette', category:'Search', timeoutMs:4000, run:async() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key:'k', code:'KeyK', ctrlKey:true, bubbles:true }));
      await wait(150);
      const palette = document.querySelector('#studio3Palette, [class*="palette" i], [role="dialog"]');
      const activeSearch = document.activeElement?.matches?.('input[type="search"], input[placeholder*="search" i], input[id*="search" i], input[id*="finder" i]');
      document.dispatchEvent(new KeyboardEvent('keydown', { key:'Escape', code:'Escape', bubbles:true }));
      return (palette && !palette.hidden && visible(palette)) || activeSearch ? 'Ctrl+K opened or focused search.' : { status:'failed', detail:'Ctrl+K did not open or focus a search interface.' };
    }});
    register({ id:'features.inventory', name:'Feature inventory', category:'Coverage', run:() => {
      const d = discover();
      const unlabelled = d.buttons.filter(x => x.label === '(unlabelled button)').length;
      return { status: unlabelled ? 'warning' : 'passed', detail:`Discovered ${d.buttons.length} buttons, ${d.sections.length} sections and ${d.searches.length} searches.${unlabelled ? ` ${unlabelled} buttons are unlabelled.` : ''}` };
    }});
    register({ id:'features.coverage', name:'Registered-test coverage', category:'Coverage', run:() => {
      const d = discover();
      const custom = [...tests.values()].filter(t => !t.id?.startsWith?.('core.'));
      const coverage = d.buttons.length ? Math.round(Math.min(100, custom.length / d.buttons.length * 100)) : 100;
      return { status: coverage < 20 ? 'warning' : 'passed', detail:`${tests.size} tests registered for ${d.buttons.length} discovered buttons. Estimated explicit coverage: ${coverage}%. Auto-inventory still records every unregistered feature.` };
    }});
    register({ id:'actions.safe-inventory', name:'Safe action inventory', category:'Actions', run:() => {
      const d = discover();
      const safe = d.buttons.filter(x => safeAction.test(x.label) && !x.destructive);
      const unsafe = d.buttons.filter(x => x.destructive);
      return `${safe.length} safe runnable candidates; ${unsafe.length} destructive controls correctly excluded from automatic clicking.`;
    }});
    register({ id:'runtime.errors', name:'Runtime error capture active', category:'Core', run:() => {
      return window.__ftSelfTestErrorCaptureActive ? 'Global error and rejection capture active.' : { status:'failed', detail:'Runtime error capture was not initialised.' };
    }});
  }

  function installErrorCapture() {
    if (window.__ftSelfTestErrorCaptureActive) return;
    window.__ftSelfTestErrorCaptureActive = true;
    window.__ftSelfTestCapturedErrors = window.__ftSelfTestCapturedErrors || [];
    window.addEventListener('error', event => window.__ftSelfTestCapturedErrors.push({ at:new Date().toISOString(), type:'error', message:event.message, source:event.filename, line:event.lineno }));
    window.addEventListener('unhandledrejection', event => window.__ftSelfTestCapturedErrors.push({ at:new Date().toISOString(), type:'rejection', message:event.reason?.stack || event.reason?.message || String(event.reason) }));
  }

  function refreshTestCount() {
    const el = document.getElementById('ftSelfTestCount');
    if (el) el.textContent = `${tests.size} tests`;
  }

  function injectUi() {
    const shell = document.createElement('div');
    shell.id = 'ftSelfTestShell';
    shell.innerHTML = `
      <button id="ftSelfTestOpen" class="ftst-open" title="Run complete Studio self-test">🩺 <span>Self-Test</span><small id="ftSelfTestCount"></small></button>
      <div id="ftSelfTestModal" class="ftst-modal" hidden>
        <div class="ftst-dialog">
          <header><div><strong>FriendshipTree Studio Self-Test</strong><span>Extensible feature and regression testing</span></div><button id="ftSelfTestClose">×</button></header>
          <div class="ftst-toolbar"><button id="ftSelfTestRun">Run complete self-test</button><button id="ftSelfTestExport" disabled>Export report</button><button id="ftSelfTestCopy" disabled>Copy summary</button></div>
          <div id="ftSelfTestProgress" class="ftst-progress"><span></span><strong>Ready</strong></div>
          <div id="ftSelfTestSummary" class="ftst-summary"></div>
          <div id="ftSelfTestResults" class="ftst-results"><p>No report yet. Run the complete self-test.</p></div>
          <footer>Future updates can call <code>FriendshipTreeStudioSelfTest.register({...})</code> or add <code>data-self-test</code> metadata. New controls are also discovered automatically.</footer>
        </div>
      </div>`;
    document.body.appendChild(shell);
    document.getElementById('ftSelfTestOpen').onclick = () => document.getElementById('ftSelfTestModal').hidden = false;
    document.getElementById('ftSelfTestClose').onclick = () => document.getElementById('ftSelfTestModal').hidden = true;
    document.getElementById('ftSelfTestModal').onclick = event => { if (event.target.id === 'ftSelfTestModal') event.currentTarget.hidden = true; };
    document.getElementById('ftSelfTestRun').onclick = runAll;
    document.getElementById('ftSelfTestExport').onclick = exportReport;
    document.getElementById('ftSelfTestCopy').onclick = copySummary;
    refreshTestCount();
  }

  function renderRunning(index, total, name) {
    const bar = document.querySelector('#ftSelfTestProgress span');
    bar.style.width = `${total ? index / total * 100 : 0}%`;
    document.querySelector('#ftSelfTestProgress strong').textContent = `Running ${index}/${total}: ${name}`;
  }

  function renderReport(report) {
    const counts = report.summary;
    document.getElementById('ftSelfTestSummary').innerHTML = `
      <div class="score ${counts.failed ? 'bad' : counts.warning ? 'warn' : 'good'}"><strong>${counts.score}%</strong><span>Overall</span></div>
      <div><strong>${counts.passed}</strong><span>Passed</span></div><div><strong>${counts.failed}</strong><span>Failed</span></div>
      <div><strong>${counts.warning}</strong><span>Warnings</span></div><div><strong>${counts.skipped}</strong><span>Skipped</span></div>
      <div><strong>${report.discovery.buttons}</strong><span>Features found</span></div>`;
    const groups = {};
    for (const result of report.results) (groups[result.category] ||= []).push(result);
    document.getElementById('ftSelfTestResults').innerHTML = Object.entries(groups).map(([category, items]) => `
      <section><h3>${esc(category)} <small>${items.length}</small></h3>${items.map(item => `
        <article class="${esc(item.status)}"><span>${item.status === 'passed' ? '✓' : item.status === 'failed' ? '✕' : item.status === 'warning' ? '⚠' : '○'}</span>
        <div><strong>${esc(item.name)}</strong><small>${esc(item.durationMs)} ms · test v${esc(item.version || '1')}</small><p>${esc(item.detail || '')}</p></div></article>`).join('')}</section>`).join('');
    document.querySelector('#ftSelfTestProgress span').style.width = '100%';
    document.querySelector('#ftSelfTestProgress strong').textContent = `Completed: ${counts.passed} passed, ${counts.failed} failed, ${counts.warning} warnings`;
    document.getElementById('ftSelfTestExport').disabled = false;
    document.getElementById('ftSelfTestCopy').disabled = false;
  }

  async function runAll() {
    if (running) return;
    backendSafetyReportPromise = null;
    running = true;
    const runButton = document.getElementById('ftSelfTestRun');
    runButton.disabled = true;
    results.length = 0;
    discover();
    const list = [...tests.values()];
    const capturedStart = window.__ftSelfTestCapturedErrors.length;
    for (let i = 0; i < list.length; i++) {
      const test = list[i];
      renderRunning(i + 1, list.length, test.name);
      const started = performance.now();
      let outcome;
      if (test.safe === false) outcome = { status:'skipped', detail:'Marked unsafe for automatic execution.' };
      else outcome = await runWithTimeout(test, { document, window, wait, discover, normalise });
      results.push({ id:test.id, name:test.name, category:test.category, version:test.version, status:outcome.status || 'passed', detail:outcome.detail || '', durationMs:Math.round(performance.now() - started) });
      await wait(20);
    }
    const newlyCaptured = window.__ftSelfTestCapturedErrors.slice(capturedStart);
    if (newlyCaptured.length) results.push({ id:'runtime.captured-during-run', name:'Errors captured during test run', category:'Core', version:'1', status:'failed', detail:newlyCaptured.map(x => x.message).join('\n'), durationMs:0 });
    const statusCount = status => results.filter(x => x.status === status).length;
    const passed = statusCount('passed'), failed = statusCount('failed'), warning = statusCount('warning'), skipped = statusCount('skipped');
    const assessed = Math.max(1, passed + failed + warning);
    const score = Math.max(0, Math.round((passed + warning * 0.5) / assessed * 100));
    lastReport = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      studioUrl: location.href,
      userAgent: navigator.userAgent,
      summary: { score, passed, failed, warning, skipped, total:results.length },
      discovery: { buttons:discovered.buttons.length, sections:discovered.sections.length, searches:discovered.searches.length },
      results:[...results],
      featureInventory:discovered,
      registrationGuide:{
        example:"FriendshipTreeStudioSelfTest.register({ id: 'feature.unique-id', name: 'Feature works', category: 'Feature', version: '1', run: async ({wait}) => { /* assertions */ return 'Passed'; } });",
        rule:'Every future feature update should register at least one smoke test and one failure-path test.'
      }
    };
    renderReport(lastReport);
    runButton.disabled = false;
    running = false;
  }

  function reportMarkdown(report) {
    const s = report.summary;
    return `# FriendshipTree Studio Self-Test Report\n\nGenerated: ${report.generatedAt}\nOverall score: ${s.score}%\nPassed: ${s.passed}\nFailed: ${s.failed}\nWarnings: ${s.warning}\nSkipped: ${s.skipped}\nDiscovered features: ${report.discovery.buttons} buttons, ${report.discovery.sections} sections, ${report.discovery.searches} search controls\n\n## Results\n\n${report.results.map(r => `### ${r.status === 'passed' ? 'PASS' : r.status === 'failed' ? 'FAIL' : r.status.toUpperCase()}: ${r.name}\nCategory: ${r.category}\nDuration: ${r.durationMs} ms\n\n${r.detail}\n`).join('\n')}\n## Future-update registration\n\nEvery new Studio feature should register tests through \`FriendshipTreeStudioSelfTest.register(...)\`. Unregistered controls remain visible in the feature inventory and reduce explicit coverage.\n`;
  }

  function exportReport() {
    if (!lastReport) return;
    const stamp = new Date().toISOString().replace(/[:.]/g, '-');
    const json = JSON.stringify(lastReport, null, 2);
    const md = reportMarkdown(lastReport);
    const combined = `FriendshipTree Studio Self-Test\n\nJSON REPORT\n===========\n${json}\n\nMARKDOWN REPORT\n===============\n${md}`;
    const blob = new Blob([combined], { type:'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `FriendshipTree-Studio-Self-Test-${stamp}.txt`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  async function copySummary() {
    if (!lastReport) return;
    const text = reportMarkdown(lastReport);
    try { await navigator.clipboard.writeText(text); }
    catch { const area = document.createElement('textarea'); area.value=text; document.body.appendChild(area); area.select(); document.execCommand('copy'); area.remove(); }
    const button = document.getElementById('ftSelfTestCopy');
    const old = button.textContent; button.textContent='Copied'; setTimeout(() => button.textContent=old, 1500);
  }

  window.FriendshipTreeStudioSelfTest = Object.freeze({
    register,
    unregister,
    runAll,
    discover,
    getTests: () => [...tests.values()].map(({run, ...meta}) => meta),
    getLastReport: () => lastReport
  });

  installErrorCapture();
  builtInTests();
  const init = () => { injectUi(); discover(); };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once:true }); else init();
})();
