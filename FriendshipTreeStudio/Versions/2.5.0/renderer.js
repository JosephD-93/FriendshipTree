const $ = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '')
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;').replaceAll('"', '&quot;');

let cleanerItems = [];
let activePlan = null;
let inspectedPackage = null;

function resultCard(title, body, className = '') {
  return `<div class="move-card ${className}"><strong>${escapeHtml(title)}</strong>${body}</div>`;
}

async function showPreview(relativePath) {
  $('preview').innerHTML = '<p>Loading preview…</p>';
  try {
    const data = await window.studio.previewFile(relativePath);
    const dependency = data.dependency
      ? `<div><b>Imports:</b> ${data.dependency.imports} · <b>Imported by:</b> ${data.dependency.importedBy}</div>`
      : '<div class="muted">Dependency data not available for this file type.</div>';
    $('preview').innerHTML = resultCard(data.path, `
      <div><b>Size:</b> ${data.size.toLocaleString()} bytes</div>
      <div><b>Modified:</b> ${escapeHtml(data.modified)}</div>
      <div><b>SHA-256:</b> <code>${escapeHtml(data.sha256)}</code></div>
      ${dependency}
      <pre class="file-preview">${escapeHtml(data.preview)}</pre>`);
    $('preview').scrollIntoView({ behavior: 'smooth', block: 'start' });
  } catch (error) {
    $('preview').innerHTML = resultCard('Preview failed', `<div class="error-text">${escapeHtml(error.message)}</div>`, 'package-invalid');
  }
}

async function calculateHealth() {
  $('health').innerHTML = '<p>Analysing project…</p>';
  try {
    const health = await window.studio.projectHealth();
    const problems = health.problems.map(x => `<li>${escapeHtml(x)}</li>`).join('');
    const positives = health.positives.map(x => `<li>${escapeHtml(x)}</li>`).join('');
    $('health').innerHTML = `
      <div class="health-score"><span>${health.score}</span><small>/100 · ${escapeHtml(health.grade)}</small></div>
      <div class="two-column">
        <div><h3>Checks passed</h3><ul>${positives || '<li>None recorded.</li>'}</ul></div>
        <div><h3>Needs attention</h3><ul>${problems || '<li>Nothing currently flagged.</li>'}</ul></div>
      </div>`;
  } catch (error) {
    $('health').innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`;
  }
}

async function buildGraph() {
  $('graph').innerHTML = '<p>Building dependency graph…</p>';
  try {
    const graph = await window.studio.buildDependencyGraph();
    const unresolved = graph.unresolved.slice(0, 20)
      .map(x => `<li>${escapeHtml(x.from)} → ${escapeHtml(x.specifier)}</li>`).join('');
    const orphans = graph.nodes.filter(x => x.orphanCandidate).slice(0, 25)
      .map(x => `<li>${escapeHtml(x.path)} <button class="small preview-btn" data-preview="${escapeHtml(x.path)}">Preview</button></li>`).join('');
    $('graph').innerHTML = resultCard('Dependency index complete', `
      <div class="metrics">
        <span>${graph.summary.files} source files</span>
        <span>${graph.summary.dependencies} resolved links</span>
        <span>${graph.summary.unresolved} unresolved</span>
        <span>${graph.summary.orphanCandidates} possible orphans</span>
      </div>
      ${unresolved ? `<details><summary>Unresolved local imports</summary><ul>${unresolved}</ul></details>` : ''}
      ${orphans ? `<details><summary>Possible orphan files — review only</summary><ul>${orphans}</ul></details>` : ''}`);
    bindPreviewButtons();
  } catch (error) {
    $('graph').innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`;
  }
}

async function scanCleaner() {
  $('cleaner').innerHTML = '<p>Analysing project…</p>';
  activePlan = null;
  $('executePlan').disabled = true;
  try {
    cleanerItems = await window.studio.scanCleaner();
    if (!cleanerItems.length) {
      $('cleaner').innerHTML = resultCard('Analysis complete', `
        <p class="success">No Cleaner candidates found.</p>
        <p class="muted">The dry-run button remains unavailable because there are no proposed file moves. This is a successful result, not a fault.</p>`);
      $('createPlan').disabled = true;
      $('createPlan').title = 'No candidates are available for a dry run.';
      return;
    }
    cleanerItems = cleanerItems
      .map((item, originalIndex) => ({ ...item, originalIndex }))
      .sort((a, b) => {
        if (a.isDirectory !== b.isDirectory) return a.isDirectory ? -1 : 1;
        return String(a.name).localeCompare(String(b.name), undefined, { numeric: true, sensitivity: 'base' });
      });

    const cards = cleanerItems.map((item, index) => {
      const rel = item.source.replace(/^C:\\Users\\Joe\\FriendshipTree\\?/i, '').replaceAll('\\', '/');
      const reasons = (item.explanation || []).map(x => `<li>${escapeHtml(x)}</li>`).join('');
      const cautions = (item.cautions || []).map(x => `<li>${escapeHtml(x)}</li>`).join('');
      const confidence = Math.round(item.confidence * 100);
      const tone = confidence >= 90 ? 'safe' : confidence >= 60 ? 'review' : 'caution';
      return `
        <article class="cleaner-item cleaner-${tone}">
          <div class="cleaner-row">
            <label class="cleaner-check" title="Include this item in the dry-run plan">
              <input type="checkbox" class="clean-select" data-index="${index}">
            </label>
            <span class="cleaner-number">${index + 1}</span>
            <div class="cleaner-main">
              <strong>${escapeHtml(item.name)}</strong>
              <span class="cleaner-path">${escapeHtml(rel)}</span>
            </div>
            <span class="confidence-badge">${confidence}% · ${escapeHtml(item.category)}</span>
            <details class="cleaner-details">
              <summary>Details</summary>
              <div class="cleaner-detail-body">
                ${reasons ? `<h4>Why it was identified</h4><ul>${reasons}</ul>` : ''}
                ${cautions ? `<h4 class="warning">Cautions</h4><ul>${cautions}</ul>` : ''}
                <p class="muted">${item.isDirectory ? 'Folder candidate — its complete contents move together.' : 'File candidate.'}</p>
                ${item.isDirectory ? '' : `<button class="small preview-btn" data-preview="${escapeHtml(rel)}">Preview file</button>`}
              </div>
            </details>
          </div>
        </article>`;
    }).join('');

    $('cleaner').innerHTML = `
      <div class="cleaner-toolbar">
        <span><b>${cleanerItems.length}</b> candidate${cleanerItems.length === 1 ? '' : 's'}</span>
        <span id="cleanerSelectedCount">0 selected</span>
        <button class="small" id="selectSafeCleaner">Select safe</button>
        <button class="small" id="selectAllCleaner">Select all</button>
        <button class="small" id="clearCleanerSelection">Clear</button>
      </div>
      <div class="cleaner-list">${cards}</div>`;

    const updateSelectedCount = () => {
      const count = document.querySelectorAll('.clean-select:checked').length;
      const label = document.getElementById('cleanerSelectedCount');
      if (label) label.textContent = `${count} selected`;
    };
    document.querySelectorAll('.clean-select').forEach(box => box.addEventListener('change', updateSelectedCount));
    document.getElementById('selectSafeCleaner').onclick = () => {
      document.querySelectorAll('.clean-select').forEach(box => {
        const item = cleanerItems[Number(box.dataset.index)];
        box.checked = Boolean(item && item.confidence >= 0.9);
      });
      updateSelectedCount();
    };
    document.getElementById('selectAllCleaner').onclick = () => {
      document.querySelectorAll('.clean-select').forEach(box => { box.checked = true; });
      updateSelectedCount();
    };
    document.getElementById('clearCleanerSelection').onclick = () => {
      document.querySelectorAll('.clean-select').forEach(box => { box.checked = false; });
      updateSelectedCount();
    };

    $('createPlan').disabled = false;
    $('createPlan').title = 'Create a reversible plan for the selected candidates.';
    bindPreviewButtons();
  } catch (error) {
    $('cleaner').innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`;
  }
}

async function createPlan() {
  const selected = [...document.querySelectorAll('.clean-select:checked')]
    .map(box => cleanerItems[Number(box.dataset.index)])
    .filter(Boolean)
    .map(item => item.source.replace(/^C:\\Users\\Joe\\FriendshipTree\\?/i, '').replaceAll('\\', '/'));
  if (!selected.length) {
    $('cleanupPlan').innerHTML = '<p class="warning">Select at least one candidate first.</p>';
    return;
  }
  activePlan = await window.studio.createCleanupPlan(selected);
  const items = activePlan.items.map(item =>
    `<li><b>${escapeHtml(item.source)}</b><br>→ ${escapeHtml(item.destination)}</li>`).join('');
  const conflicts = activePlan.conflicts.map(item =>
    `<li>${escapeHtml(item.path)}: ${escapeHtml(item.problem)}</li>`).join('');
  $('cleanupPlan').innerHTML = resultCard(`Dry run: ${activePlan.totals.risk}`, `
    <div><b>Items:</b> ${activePlan.totals.files}</div>
    <div><b>Total size:</b> ${activePlan.totals.bytes.toLocaleString()} bytes</div>
    <div><b>Conflicts:</b> ${activePlan.totals.conflicts}</div>
    <details open><summary>Planned moves</summary><ol>${items}</ol></details>
    ${conflicts ? `<div class="error-text"><b>Blocked conflicts</b><ul>${conflicts}</ul></div>` : ''}
    <p><b>No files have been moved.</b></p>`,
    activePlan.conflicts.length ? 'package-invalid' : 'package-valid');
  $('executePlan').disabled = activePlan.conflicts.length > 0;
}

async function executePlan() {
  if (!activePlan) return;
  if (!activePlan.items.length) {
    $('cleanupPlan').insertAdjacentHTML('beforeend', '<p class="error-text">The plan contains zero items, so nothing was moved.</p>');
    return;
  }
  if (!confirm(`Move ${activePlan.items.length} selected item(s) to quarantine exactly as shown in the dry run?`)) return;
  $('executePlan').disabled = true;
  $('cleanupPlan').insertAdjacentHTML('beforeend', '<p id="cleanupRunning">Executing and verifying quarantine move…</p>');
  try {
    const result = await window.studio.executeCleanupPlan(activePlan);
    document.getElementById('cleanupRunning')?.remove();
    if (result.ok) {
      const receipt = result.completed.map(item =>
        `<li><b>${escapeHtml(item.source || '')}</b><br>→ ${escapeHtml(item.target || '')}<br><span class="muted">Method: ${escapeHtml(item.moveMethod || 'move')}</span></li>`
      ).join('');
      $('cleanupPlan').insertAdjacentHTML('beforeend',
        `<div class="package-valid"><p class="success"><b>Verified complete.</b> ${result.completed.length} item(s) moved.</p><p><b>Exact quarantine root:</b> C:\Users\Joe\FriendshipTree\.studio\Quarantine</p><ol>${receipt}</ol></div>`);
      activePlan = null;
      await scanCleaner();
    } else {
      $('cleanupPlan').insertAdjacentHTML('beforeend',
        `<p class="error-text"><b>Quarantine failed.</b> Stopped after ${result.completed?.length || 0} item(s): ${escapeHtml(result.message || 'Unknown error')}</p>`);
    }
  } catch (error) {
    document.getElementById('cleanupRunning')?.remove();
    $('cleanupPlan').insertAdjacentHTML('beforeend', `<p class="error-text"><b>Quarantine IPC error:</b> ${escapeHtml(error.message)}</p>`);
  } finally {
    await refreshRecovery();
  }
}

function renderPackageInspection(result) {
  if (result?.canceled) { $('packageInspection').innerHTML = '<p class="muted">No package selected.</p>'; return; }
  inspectedPackage = result;
  const manifest = result.manifest || {};
  const errors = (result.errors || []).map(x => `<li>${escapeHtml(x)}</li>`).join('');
  const warnings = (result.warnings || []).map(x => `<li>${escapeHtml(x)}</li>`).join('');
  $('packageInspection').innerHTML = resultCard(
    result.ok ? '✓ Package validated and ready' : '✕ Package rejected',
    `<div><b>ID:</b> ${escapeHtml(manifest.packageId || 'Unknown')}</div>
     <div><b>Type:</b> ${escapeHtml(manifest.packageType || 'Unknown')}</div>
     <div><b>Version:</b> ${escapeHtml(manifest.version || 'Unknown')}</div>
     <div><b>Verified files:</b> ${(result.verifiedFiles || []).length}</div>
     <div><b>Next step:</b> ${result.ok ? 'Press Install and restart. Studio handles the remainder.' : 'Resolve the validation errors below.'}</div>
     ${warnings ? `<div class="warning"><ul>${warnings}</ul></div>` : ''}
     ${errors ? `<div class="error-text"><ul>${errors}</ul></div>` : ''}`,
    result.ok ? 'package-valid' : 'package-invalid');
  $('installPackage').disabled = !result.ok;
}

async function inspectPackage(packagePath = null) {
  $('installPackage').disabled = true;
  $('packageInspection').innerHTML = '<p>Inspecting and verifying package…</p>';
  const result = packagePath ? await window.studio.inspectUpdatePackagePath(packagePath) : await window.studio.chooseUpdatePackage();
  renderPackageInspection(result);
}

async function installPackage() {
  if (!inspectedPackage?.ok) return;
  $('installPackage').disabled = true;
  const result = await window.studio.installUpdatePackage();
  $('packageInspection').insertAdjacentHTML('beforeend',
    result.ok
      ? (result.restarting ? '<p class="success"><b>Installed and verified.</b> Studio is restarting automatically…</p>' : '<p class="success"><b>Installed and verified.</b></p>')
      : `<p class="error-text">Installation failed and was rolled back: ${escapeHtml(result.message)}</p>`);
  if (!result.restarting) await refreshRecovery();
}

async function refreshRecovery() {
  $('recovery').innerHTML = '<p>Loading recovery points…</p>';
  try {
    const points = await window.studio.listRecoveryPoints();
    if (!points.length) {
      $('recovery').innerHTML = '<p class="muted">No recovery points recorded yet.</p>';
      return;
    }
    $('recovery').innerHTML = points.slice(0, 50).map(point => resultCard(
      point.description,
      `<div>${escapeHtml(point.createdAt || '')}</div>
       <div><b>Status:</b> ${escapeHtml(point.status)}</div>
       ${point.recoverable
         ? `<button class="small recovery-btn" data-type="${escapeHtml(point.type)}" data-id="${escapeHtml(point.id)}">Restore</button>`
         : '<span class="muted">No automatic restore available</span>'}`
    )).join('');
    document.querySelectorAll('.recovery-btn').forEach(button => {
      button.onclick = async () => {
        if (!confirm(`Restore ${button.dataset.id}?`)) return;
        button.disabled = true;
        const result = button.dataset.type === 'package'
          ? await window.studio.restorePackageInstallation(button.dataset.id)
          : await window.studio.undoTransaction(button.dataset.id);
        button.insertAdjacentHTML('afterend',
          result.ok ? '<span class="success"> Restored.</span>' :
          `<span class="error-text"> ${escapeHtml(result.message)}</span>`);
      };
    });
  } catch (error) {
    $('recovery').innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`;
  }
}

async function runTests() {
  $('tests').innerHTML = '<p>Running safety tests…</p>';
  let report;
  try { report = await window.studio.runSelfTests(); }
  catch (error) {
    $('tests').innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`;
    return;
  }
  $('tests').innerHTML = resultCard(
    report.failed ? 'Self-tests found a problem' : 'All self-tests passed',
    `<div><b>Passed:</b> ${report.passed} · <b>Failed:</b> ${report.failed}</div>
     <ul>${report.results.map(x =>
       `<li class="${x.ok ? 'success' : 'error-text'}">${x.ok ? '✓' : '✕'} ${escapeHtml(x.name)}${x.message ? ` — ${escapeHtml(x.message)}` : ''}</li>`
     ).join('')}</ul>
     <div class="muted">Report: ${escapeHtml(report.reportPath)}</div>`,
    report.failed ? 'package-invalid' : 'package-valid');
}

async function buildManifest() {
  const button = $('buildManifest');
  button.disabled = true;
  $('manifestSummary').innerHTML = '<p>Building manifest…</p>';
  try {
    const result = await window.studio.buildManifest();
    $('manifestSummary').innerHTML = result.ok
      ? resultCard('Manifest refreshed', `<div>${result.count.toLocaleString()} files indexed.</div><div class="muted">${escapeHtml(result.path || '')}</div>`)
      : `<p class="error-text">${escapeHtml(result.message || 'Manifest build failed.')}</p>`;
    if (result.ok) $('log').textContent += `\nManifest refreshed: ${result.count} files`;
  } catch (error) {
    $('manifestSummary').innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`;
  } finally {
    button.disabled = false;
  }
}

async function loadExplorer() {
  const data = await window.studio.getExplorer();
  let entries = Array.isArray(data) ? data : (data.files || []);
  if (!entries.length && data && data.groups) {
    entries = Object.values(data.groups).flatMap(modules =>
      Object.values(modules).flatMap(files => files)
    );
  }
  $('explorer').innerHTML = entries.slice(0, 300).map(item => {
    const path = item.path || item.relativePath || item.file || '';
    return `<div class="explorer-row"><span>${escapeHtml(path)}</span>
      ${path ? `<button class="small preview-btn" data-preview="${escapeHtml(path)}">Preview</button>` : ''}</div>`;
  }).join('') || '<p class="muted">Build the manifest first.</p>';
  bindPreviewButtons();
}

let organiserItems = [];

async function scanMisplaced() {
  organiserItems = await window.studio.scanMisplaced();
  $('moveSelected').disabled = true;
  if (!organiserItems.length) {
    $('moves').innerHTML = '<p class="success">The project root is already organised.</p>';
    return;
  }
  const rows = organiserItems.map((item, index) => {
    const confidence = Math.round((item.confidence || 0) * 100);
    const detail = (item.details || []).map(x => `<li>${escapeHtml(x)}</li>`).join('');
    return `<article class="cleaner-item">
      <div class="cleaner-row">
        <label class="cleaner-check"><input type="checkbox" class="organiser-select" data-index="${index}"></label>
        <span class="cleaner-number">${index + 1}</span>
        <div class="cleaner-main"><strong>${escapeHtml(item.name)}</strong><span class="cleaner-path">→ ${escapeHtml(item.destination || item.target || '')}</span></div>
        <span class="confidence-badge">${confidence}%</span>
        <details class="cleaner-details"><summary>Details</summary><div class="cleaner-detail-body"><ul>${detail}</ul><p class="muted">${item.isDirectory ? 'Folder' : 'File'} · reversible through Recovery Centre.</p></div></details>
      </div>
    </article>`;
  }).join('');
  $('moves').innerHTML = `<div class="cleaner-toolbar"><span><b>${organiserItems.length}</b> item${organiserItems.length === 1 ? '' : 's'} can be organised</span><span id="organiserSelectedCount">0 selected</span><button class="small" id="selectAllOrganiser">Select all</button><button class="small" id="clearOrganiser">Clear</button></div><div class="cleaner-list">${rows}</div>`;
  const update = () => {
    const count = document.querySelectorAll('.organiser-select:checked').length;
    $('organiserSelectedCount').textContent = `${count} selected`;
    $('moveSelected').disabled = count === 0;
  };
  document.querySelectorAll('.organiser-select').forEach(box => box.addEventListener('change', update));
  $('selectAllOrganiser').onclick = () => { document.querySelectorAll('.organiser-select').forEach(x => x.checked = true); update(); };
  $('clearOrganiser').onclick = () => { document.querySelectorAll('.organiser-select').forEach(x => x.checked = false); update(); };
}

async function moveSelectedOrganiserItems() {
  const selected = [...document.querySelectorAll('.organiser-select:checked')]
    .map(box => organiserItems[Number(box.dataset.index)]).filter(Boolean);
  if (!selected.length) return;
  if (!confirm(`Move ${selected.length} selected item(s) into the proposed folders?`)) return;
  $('moveSelected').disabled = true;
  let moved = 0;
  const failures = [];
  for (const item of selected) {
    const result = await window.studio.moveFile(item);
    if (result.ok) moved++;
    else failures.push(`${item.name}: ${result.message || 'Unknown error'}`);
  }
  $('moves').insertAdjacentHTML('afterbegin', failures.length
    ? `<p class="warning"><b>${moved} moved.</b> ${failures.length} failed: ${escapeHtml(failures.join(' | '))}</p>`
    : `<p class="success"><b>${moved} item(s) organised successfully.</b> They can be restored from Recovery Centre.</p>`);
  await scanMisplaced();
  await refreshRecovery();
}

function bindPreviewButtons() {
  document.querySelectorAll('.preview-btn').forEach(button => {
    button.onclick = () => showPreview(button.dataset.preview);
  });
}


async function renderProjectKnowledge(build=false) {
  $('knowledge').innerHTML='<p>Building project knowledge…</p>';
  try {
    const result=build ? await window.studio.buildProjectKnowledge() : await window.studio.getProjectKnowledge();
    if(!result.ok) throw new Error(result.message||'Knowledge build failed.');
    const data=result.data, s=data.summary||{};
    const changed=(data.files||[]).filter(f=>['Added','Modified','Removed'].includes(f.status)).slice(0,80);
    const rows=changed.map(f=>`<tr><td>${escapeHtml(f.status)}</td><td>${escapeHtml(f.path)}</td><td>${escapeHtml(f.module)}</td><td>${Number(f.size||0).toLocaleString()}</td></tr>`).join('');
    $('knowledge').innerHTML=`
      <div class="health-score"><span>${Number(s.totalCurrent||0).toLocaleString()}</span><small> current files catalogued</small></div>
      <div class="knowledge-stats">
        <div><b>${s.added||0}</b><span>Added since prior snapshot</span></div>
        <div><b>${s.modified||0}</b><span>Modified</span></div>
        <div><b>${s.removed||0}</b><span>Removed</span></div>
        <div><b>${s.unchanged||0}</b><span>Unchanged</span></div>
      </div>
      <p class="muted">Database: C:/Users/Joe/FriendshipTree/.studio/Knowledge/project-database.json</p>
      ${rows?`<details><summary>Changes compared with previous snapshot</summary><div class="table-wrap"><table><thead><tr><th>Status</th><th>Path</th><th>Module</th><th>Bytes</th></tr></thead><tbody>${rows}</tbody></table></div></details>`:'<p class="success">No historical change comparison is available yet. The next knowledge build will compare against this snapshot.</p>'}`;
    await renderManifestHistory();
  } catch(error){$('knowledge').innerHTML=`<p class="error-text">${escapeHtml(error.message)}</p>`;}
}
async function renderManifestHistory(){
  const history=await window.studio.listManifestHistory();
  if(!history.length){$('history').innerHTML='<p class="muted">No historical manifests recorded.</p>';return;}
  const options=history.map(h=>`<option value="${escapeHtml(h.snapshotId)}">${escapeHtml(h.projectVersion||'working-copy')} · ${escapeHtml(h.capturedAt||'')}</option>`).join('');
  $('history').innerHTML=`<details open><summary>Manifest history (${history.length})</summary><div class="actions"><label>Newer <select id="compareNewer">${options}</select></label><label>Older <select id="compareOlder">${options}</select></label><button id="compareSnapshots" ${history.length<2?'disabled':''}>Compare snapshots</button></div><div id="snapshotComparison"></div></details>`;
  if(history.length>1){$('compareOlder').selectedIndex=1;$('compareSnapshots').onclick=async()=>{const r=await window.studio.compareManifestSnapshots($('compareNewer').value,$('compareOlder').value);if(!r.ok){$('snapshotComparison').innerHTML=`<p class="error-text">${escapeHtml(r.message)}</p>`;return;}const d=r.data;$('snapshotComparison').innerHTML=resultCard('Release comparison',`<div><b>Added:</b> ${d.counts.added} · <b>Modified:</b> ${d.counts.modified} · <b>Removed:</b> ${d.counts.removed}</div>${d.added.length?`<details><summary>Added</summary><ul>${d.added.slice(0,100).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></details>`:''}${d.modified.length?`<details><summary>Modified</summary><ul>${d.modified.slice(0,100).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></details>`:''}${d.removed.length?`<details><summary>Removed</summary><ul>${d.removed.slice(0,100).map(x=>`<li>${escapeHtml(x)}</li>`).join('')}</ul></details>`:''}`);};}
}


async function renderProjectDNA(build=false){
  $('dna').innerHTML='<p>Tracing the active application and analysing source code…</p>';
  try{
    const result=build?await window.studio.buildProjectDNA():await window.studio.getProjectDNA();
    if(!result.ok)throw new Error(result.message||'Project DNA analysis failed.');
    const d=result.data,s=d.summary||{},debt=d.technicalDebt||{},roles=d.sourceRoles||{};
    const systems=(d.systems||[]).map(sys=>`<details><summary><b>${escapeHtml(sys.name)}</b> · ${sys.files.length} active files · ${sys.components.length} components</summary><ul>${sys.files.slice(0,60).map(f=>`<li><code>${escapeHtml(f.relativePath)}</code> <span class="muted">${Number(f.lines||0).toLocaleString()} lines${f.components.length?` · ${escapeHtml(f.components.join(', '))}`:''}</span></li>`).join('')}</ul></details>`).join('');
    const large=(debt.largeFiles||[]).slice(0,30).map(x=>`<tr><td>${escapeHtml(x.path)}</td><td>${Number(x.lines).toLocaleString()}</td><td>${escapeHtml(x.system)}</td></tr>`).join('');
    const dup=(debt.duplicateFunctions||[]).slice(0,30).map(x=>`<tr><td>${escapeHtml(x.name)}</td><td>${x.paths.length}</td><td>${escapeHtml(x.paths.join(' · '))}</td></tr>`).join('');
    const hist=(d.historicalCandidates||[]).map(x=>`<tr><td>${escapeHtml(x.path)}</td><td>${escapeHtml(x.similarTo)}</td><td>${Number(x.similarity).toFixed(1)}%</td><td>${escapeHtml(x.confidence)}</td></tr>`).join('');
    const unref=(roles.unreferenced||[]).map(x=>`<li><code>${escapeHtml(x)}</code></li>`).join('');
    $('dna').innerHTML=`
      <p><b>Entry chain:</b> ${(d.entryFiles||[]).map(x=>`<code>${escapeHtml(x)}</code>`).join(', ')||'Not detected'}</p>
      <div class="knowledge-stats dna-stats"><div><b>${s.activeFiles||0}</b><span>Active source files</span></div><div><b>${Number(s.activeLines||0).toLocaleString()}</b><span>Active lines</span></div><div><b>${s.components||0}</b><span>Active components</span></div><div><b>${s.functions||0}</b><span>Active functions</span></div><div><b>${(roles.historical||[]).length}</b><span>Historical snapshots</span></div><div><b>${(roles.unreferenced||[]).length}</b><span>Other unreferenced</span></div></div>
      <p class="success"><b>Generated:</b> Architecture.md and FriendshipTree_AI_Context.md now exclude verified historical snapshots from active project totals.</p>
      <details open><summary>Active detected systems (${(d.systems||[]).length})</summary><div class="dna-systems">${systems}</div></details>
      <details open><summary>Historical source candidates (${(d.historicalCandidates||[]).length})</summary><p class="muted">Studio has not moved these files. It verified they are outside the static entry chain and compared their structure with active source.</p>${hist?`<div class="table-wrap"><table><thead><tr><th>Candidate</th><th>Similar active file</th><th>Similarity</th><th>Confidence</th></tr></thead><tbody>${hist}</tbody></table></div>`:'<p class="success">None detected.</p>'}</details>
      <details><summary>Other unreferenced source (${(roles.unreferenced||[]).length})</summary>${unref?`<ul>${unref}</ul>`:'<p class="success">None detected.</p>'}</details>
      <details><summary>Large active files — 1,000+ lines (${(debt.largeFiles||[]).length})</summary>${large?`<div class="table-wrap"><table><thead><tr><th>File</th><th>Lines</th><th>System</th></tr></thead><tbody>${large}</tbody></table></div>`:'<p class="success">None detected.</p>'}</details>
      <details><summary>Repeated significant function names (${(debt.duplicateFunctions||[]).length})</summary><p class="muted">Restricted to active and test/support source; short generic local names are ignored.</p>${dup?`<div class="table-wrap"><table><thead><tr><th>Name</th><th>Files</th><th>Locations</th></tr></thead><tbody>${dup}</tbody></table></div>`:'<p class="success">None detected.</p>'}</details>`;
  }catch(error){$('dna').innerHTML=`<p class="error-text">${escapeHtml(error.message)}</p>`;}
}


let currentAIWorkspace = null;
let activeAITab = 'summary';

function simpleMarkdown(text='') {
  return escapeHtml(text)
    .replace(/^### (.+)$/gm,'<h4>$1</h4>')
    .replace(/^## (.+)$/gm,'<h3>$1</h3>')
    .replace(/^# (.+)$/gm,'<h2>$1</h2>')
    .replace(/^[-*] (.+)$/gm,'<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g,m=>`<ul>${m}</ul>`)
    .replace(/\*\*(.+?)\*\*/g,'<strong>$1</strong>')
    .replace(/`([^`]+)`/g,'<code>$1</code>')
    .replace(/\n\n/g,'</p><p>')
    .replace(/\n/g,'<br>');
}

function renderAIWorkspaceTab(tab=activeAITab) {
  activeAITab=tab;
  document.querySelectorAll('.ai-tab').forEach(b=>b.classList.toggle('active',b.dataset.aiTab===tab));
  const d=currentAIWorkspace;
  if(!d){$('aiWorkspace').innerHTML='<p class="muted">Analyse the source code to build the AI workspace.</p>';return;}
  const s=d.summary||{}, debt=d.technicalDebt||{};
  if(tab==='summary') $('aiWorkspace').innerHTML=`<div class="knowledge-stats"><div><b>${s.activeFiles||s.files||0}</b><span>Active source files</span></div><div><b>${Number(s.activeLines||s.lines||0).toLocaleString()}</b><span>Active lines</span></div><div><b>${s.components||0}</b><span>Components</span></div><div><b>${(d.systems||[]).length}</b><span>Systems</span></div></div><p><b>Generated:</b> ${escapeHtml(d.generatedAt||'')}</p><p class="muted">This view is stored directly in Studio; no paid Markdown application is required.</p>`;
  else if(tab==='architecture') $('aiWorkspace').innerHTML=`<div class="markdown-view"><p>${simpleMarkdown(d.architecture||'No architecture file generated.')}</p></div>`;
  else if(tab==='systems') $('aiWorkspace').innerHTML=(d.systems||[]).map(x=>`<details><summary><b>${escapeHtml(x.name)}</b> · ${x.files.length} files</summary><ul>${x.files.map(f=>`<li><code>${escapeHtml(f.relativePath)}</code>${f.components?.length?` — ${escapeHtml(f.components.join(', '))}`:''}</li>`).join('')}</ul></details>`).join('')||'<p>No systems detected.</p>';
  else if(tab==='debt') $('aiWorkspace').innerHTML=`<div class="knowledge-stats"><div><b>${(debt.largeFiles||[]).length}</b><span>Large files</span></div><div><b>${(debt.duplicateFunctions||[]).length}</b><span>Repeated names</span></div><div><b>${(debt.complexFiles||[]).length}</b><span>Complex files</span></div><div><b>${s.todos||0}</b><span>TODO markers</span></div></div>${(debt.largeFiles||[]).slice(0,20).map(x=>`<div class="ai-debt-row"><code>${escapeHtml(x.path)}</code><span>${Number(x.lines).toLocaleString()} lines</span></div>`).join('')}`;
  else $('aiWorkspace').innerHTML=`<div class="markdown-view"><p>${simpleMarkdown(d.context||'No AI context generated.')}</p></div>`;
}

async function loadAIWorkspace(build=false){
  $('aiStatus').innerHTML='<p>Preparing AI workspace…</p>';
  try{
    if(build){const b=await window.studio.buildProjectDNA();if(!b.ok)throw new Error(b.message||'DNA analysis failed.');}
    const r=await window.studio.getAIWorkspace();
    if(!r.ok)throw new Error(r.message||'AI workspace could not be loaded.');
    currentAIWorkspace=r.data;
    $('aiStatus').innerHTML=`<p class="success">AI workspace ready · generated ${escapeHtml(r.data.generatedAt||'')}</p>`;
    renderAIWorkspaceTab();
  }catch(e){$('aiStatus').innerHTML=`<p class="error-text">${escapeHtml(e.message)}</p>`;}
}

async function copyContext(target){
  const r=await window.studio.copyAIContext(target);
  $('aiStatus').innerHTML=r.ok?`<p class="success">Copied ${Number(r.characters||0).toLocaleString()} characters for ${escapeHtml(target==='claude'?'Claude':'ChatGPT')}.</p>`:`<p class="error-text">${escapeHtml(r.message||'Copy failed.')}</p>`;
}


async function renderDevelopmentPartner() {
  const host = $('partnerDashboard');
  host.innerHTML = '<p>Reading project intelligence…</p>';
  try {
    const result = await window.studio.getDevelopmentPartner();
    if (!result.ok) throw new Error(result.message || 'Development Partner could not load.');
    const data = result.data;
    const status = (data.status || []).map(x => `<div class="partner-status ${escapeHtml(x.state)}"><span>${escapeHtml(x.label)}</span><b>${escapeHtml(x.value)}</b></div>`).join('');
    const recs = (data.recommendations || []).map((x,i) => `<article class="partner-recommendation priority-${x.priority}"><div class="partner-rank">${i+1}</div><div><div class="partner-system">${escapeHtml(x.system)} · Priority ${x.priority}</div><h3>${escapeHtml(x.title)}</h3><p>${escapeHtml(x.reason)}</p><details><summary>Recommended action</summary><p>${escapeHtml(x.action)}</p></details></div></article>`).join('');
    host.innerHTML = `<div class="partner-status-grid">${status}</div><div class="partner-next"><span>Best next action</span><strong>${escapeHtml(data.nextBestAction?.title || 'No action required')}</strong></div><div class="partner-list">${recs}</div><p class="muted">Generated ${escapeHtml(data.generatedAt)}. ${escapeHtml(data.limitations || '')}</p>`;
  } catch (error) {
    host.innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`;
  }
}

$('buildKnowledge').onclick = () => renderProjectKnowledge(true);
$('loadKnowledge').onclick = () => renderProjectKnowledge(false);
renderProjectDNA(false);
$('openKnowledge').onclick = () => window.studio.openKnowledgeFolder();
$('buildDNA').onclick = async () => { await renderProjectDNA(true); await loadAIWorkspace(false); };
$('loadDNA').onclick = async () => { await renderProjectDNA(false); await loadAIWorkspace(false); };
document.querySelectorAll('.ai-tab').forEach(b=>b.onclick=()=>renderAIWorkspaceTab(b.dataset.aiTab));
$('openKnowledgeFile').onclick = () => window.studio.showAIContext();
$('copyChatGPT').onclick = () => copyContext('chatgpt');
$('copyClaude').onclick = () => copyContext('claude');
$('exportAIPackage').onclick = async () => { $('aiStatus').innerHTML='<p>Building AI package…</p>'; const r=await window.studio.exportAIPackage(); $('aiStatus').innerHTML=r.ok?`<p class="success">AI package exported: <code>${escapeHtml(r.path)}</code></p>`:`<p class="error-text">${escapeHtml(r.message||'Export failed.')}</p>`; };

$('calculateHealth').onclick = calculateHealth;
$('buildGraph').onclick = buildGraph;
$('scanCleaner').onclick = scanCleaner;
$('exportCleanerAnalysis').onclick = async () => {
  const button = $('exportCleanerAnalysis');
  button.disabled = true;
  $('log').textContent += '\nExporting project analysis…';
  try {
    const result = await window.studio.exportCleanerAnalysis();
    if (result.ok) $('log').textContent += `\nProject analysis exported: ${result.path}`;
    else if (!result.canceled) $('log').textContent += `\nProject analysis export failed: ${result.message || 'Unknown error'}`;
  } catch (error) {
    $('log').textContent += `\nProject analysis export failed: ${error.message}`;
  } finally { button.disabled = false; }
};
$('createPlan').onclick = createPlan;
$('executePlan').onclick = executePlan;
$('openQuarantine').onclick = () => window.studio.openQuarantineFolder();
$('choosePackage').onclick = () => inspectPackage();
$('installPackage').onclick = installPackage;
const updateDropZone = $('updateDropZone');
if (updateDropZone) {
  ['dragenter','dragover'].forEach(type => updateDropZone.addEventListener(type, event => { event.preventDefault(); event.stopPropagation(); updateDropZone.classList.add('dragging'); }));
  ['dragleave','drop'].forEach(type => updateDropZone.addEventListener(type, event => { event.preventDefault(); event.stopPropagation(); updateDropZone.classList.remove('dragging'); }));
  updateDropZone.addEventListener('drop', event => { const file=event.dataTransfer?.files?.[0]; if(file?.path) inspectPackage(file.path); });
  updateDropZone.addEventListener('click', () => inspectPackage());
  updateDropZone.addEventListener('keydown', event => { if(event.key==='Enter'||event.key===' ') inspectPackage(); });
}
window.studio.consumeLaunchPackage().then(result => { if(result && !result.canceled){ document.querySelector('.update-panel')?.scrollIntoView({behavior:'smooth',block:'start'}); renderPackageInspection(result); } }).catch(()=>{});
$('openPackageHistory').onclick = () => window.studio.openPackageHistory();
$('refreshRecovery').onclick = refreshRecovery;
$('openRecoveryFolder').onclick = () => window.studio.openRecoveryFolder();
$('runTests').onclick = runTests;
$('buildManifest').onclick = buildManifest;
$('loadExplorer').onclick = loadExplorer;
$('scanMisplaced').onclick = scanMisplaced;
$('moveSelected').onclick = moveSelectedOrganiserItems;
$('exportReport').onclick = async () => {
  const result = await window.studio.exportReport();
  $('log').textContent += result.ok ? `\nReport exported: ${result.path}` : `\nReport failed: ${result.message}`;
};
$('refreshAll').onclick = async () => {
  await Promise.all([calculateHealth(), refreshRecovery(), renderDevelopmentPartner()]);
};
$('refreshPartner').onclick = renderDevelopmentPartner;

document.querySelectorAll('[data-path]').forEach(button => {
  button.onclick = () => window.studio.openPath(button.dataset.path);
});
document.querySelectorAll('[data-action]').forEach(button => {
  button.onclick = async () => {
    const action = button.dataset.action;
    button.disabled = true;
    const result = await window.studio[action]();
    button.disabled = false;
    $('log').textContent += `\n${action}: ${result.ok ? 'completed' : result.message || 'failed'}`;
  };
});
window.studio.onLog(text => {
  $('log').textContent += text;
  $('log').scrollTop = $('log').scrollHeight;
});

window.studio.appInfo().then(info=>{ $('studioVersion').textContent='V'+info.version.replace(/\.0$/,''); document.title=`FriendshipTree Studio V${info.version.replace(/\.0$/,'')}`; });
refreshRecovery();
renderDevelopmentPartner();
renderProjectKnowledge(false);
renderProjectDNA(false);
loadAIWorkspace(false);
