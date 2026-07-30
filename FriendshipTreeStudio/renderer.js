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


function renderAutomaticUpdateEvent(event) {
  const el = $('automaticUpdateStatus');
  if (!el || !event) return;
  const file = event.file ? `<br><b>File:</b> ${escapeHtml(event.file)}` : '';
  const version = event.version ? `<br><b>Version:</b> ${escapeHtml(event.version)}` : '';
  const type = event.packageType ? `<br><b>Target:</b> ${event.packageType === 'studio-update' ? 'FriendshipTree Studio' : 'FriendshipTree app'}` : '';
  const messages = {
    watching: ['Automatic updates active', `Watching ${escapeHtml(event.folder || '')}`, 'success'],
    detected: ['Update detected', 'Waiting for the file to finish saving before validation.', 'warning'],
    validated: ['Update validated', 'Backup and transactional installation are starting automatically.', 'success'],
    installed: ['Update installed', event.restartRequired ? 'Studio will restart automatically.' : 'The FriendshipTree project has been updated.', 'success'],
    restarting: ['Restarting Studio', 'The update is complete.', 'success'],
    rejected: ['Update rejected safely', `The file was moved to Rejected.${(event.errors || []).length ? '<br>' + (event.errors || []).map(escapeHtml).join('<br>') : ''}`, 'error-text'],
    failed: ['Update failed and was protected', escapeHtml(event.error || 'Unknown failure'), 'error-text'],
    'watcher-error': ['Update-folder watcher error', escapeHtml(event.error || ''), 'error-text']
  };
  const [title, body, kind] = messages[event.status] || ['Automatic update activity', escapeHtml(event.status || ''), 'muted'];
  el.className = `status-box ${kind}`;
  el.innerHTML = `<b>${title}</b><div>${body}${file}${version}${type}</div>`;
}

async function initialiseUpdateInbox() {
  let status = await window.studio.getUpdateInboxStatus();
  if (!status?.watching) {
    await new Promise(resolve => setTimeout(resolve, 1200));
    status = await window.studio.getUpdateInboxStatus();
  }
  if (status?.folder && $('updateInboxPath')) $('updateInboxPath').textContent = status.folder;
  renderAutomaticUpdateEvent({
    status: status?.watching ? 'watching' : 'watcher-error',
    folder: status?.folder,
    error: status?.watching ? null : 'Studio could not start the folder watcher. Press Check folder now, or restart Studio.'
  });
}

function renderPackageInspection(result) {
  if (result?.canceled) { $('packageInspection').innerHTML = '<p class="muted">No package selected.</p>'; return; }
  inspectedPackage = result;
  const manifest = result.manifest || {};
  const errors = (result.errors || []).map(x => `<li>${escapeHtml(x)}</li>`).join('');
  const warnings = (result.warnings || []).map(x => `<li>${escapeHtml(x)}</li>`).join('');
  $('packageInspection').innerHTML = resultCard(
    result.ok ? '✓ Package validated — not installed yet' : '✕ Package rejected',
    `<div><b>ID:</b> ${escapeHtml(manifest.packageId || 'Unknown')}</div>
     <div><b>Type:</b> ${escapeHtml(manifest.packageType || 'Unknown')}</div>
     <div><b>Version:</b> ${escapeHtml(manifest.version || 'Unknown')}</div>
     <div><b>Verified files:</b> ${(result.verifiedFiles || []).length}</div>
     <div><b>Next step:</b> ${result.ok ? 'Click Install and restart. Validation alone does not change Studio.' : 'Resolve the validation errors below.'}</div>
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
      ? `<div class="move-card package-valid">
          <strong>✓ Installed and verified against the live Studio files</strong>
          <div><b>Installed version:</b> ${escapeHtml(result.installedStudioVersion || result.history?.version || 'Unknown')}</div>
          <div><b>Verified live files:</b> ${Number(result.verifiedLiveFiles || 0)}</div>
          <div><b>Installed root:</b> <code>${escapeHtml(result.installedRoot || 'Unknown')}</code></div>
          <div><b>Restart:</b> ${result.restarting ? 'Starting automatically now…' : 'Not required'}</div>
        </div>`
      : `<p class="error-text"><b>Installation failed and was rolled back:</b> ${escapeHtml(result.message)}</p>`);
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
    const organiserSelectedCount = $('organiserSelectedCount');
    if (organiserSelectedCount) organiserSelectedCount.textContent = `${count} selected`;
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
  if (history.length > 1) {
    const compareOlder = $('compareOlder');
    const compareNewer = $('compareNewer');
    const compareSnapshots = $('compareSnapshots');
    const snapshotComparison = $('snapshotComparison');
    if (compareOlder && compareNewer && compareSnapshots && snapshotComparison) {
      compareOlder.selectedIndex = 1;
      compareSnapshots.onclick = async () => {
        const r = await window.studio.compareManifestSnapshots(compareNewer.value, compareOlder.value);
        if (!r.ok) {
          snapshotComparison.innerHTML = `<p class="error-text">${escapeHtml(r.message)}</p>`;
          return;
        }
        const d = r.data;
        snapshotComparison.innerHTML = resultCard('Release comparison',
          `<div><b>Added:</b> ${d.counts.added} · <b>Modified:</b> ${d.counts.modified} · <b>Removed:</b> ${d.counts.removed}</div>`);
      };
    }
  }
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

function renderSeamlessStatus(title, body, kind = '') {
  const el = $('seamlessAppStatus');
  el.className = `status-box ${kind}`.trim();
  el.innerHTML = `<b>${escapeHtml(title)}</b><div>${body}</div>`;
}

async function exportAiSyncPackage() {
  renderSeamlessStatus('Creating AI Sync package…', 'Studio is refreshing project knowledge and packaging the active source.');
  const result = await window.studio.exportAiSyncPackage();
  if (result?.canceled) return renderSeamlessStatus('Cancelled', 'No file was created.', 'muted');
  if (!result?.ok) return renderSeamlessStatus('Export failed', escapeHtml(result?.message || 'Unknown error'), 'error-text');
  renderSeamlessStatus('AI Sync package ready', `${escapeHtml(result.path)}<br>${result.activeFiles} active project files included. Upload this single ZIP to ChatGPT.`, 'success');
}

async function checkDevices() {
  renderSeamlessStatus('Checking devices…', 'Looking for USB and wireless ADB connections.');
  const result = await window.studio.adbDevices();
  if (!result?.ok) return renderSeamlessStatus('ADB check failed', escapeHtml(result?.message || result?.stderr || 'Unknown error'), 'error-text');
  const devices = result.devices || [];
  renderSeamlessStatus('Connected Android devices', devices.length
    ? devices.map(d => `${escapeHtml(d.serial)} — ${escapeHtml(d.state)} ${escapeHtml(d.details || '')}`).join('<br>')
    : 'No device is connected. USB debugging or Wireless debugging must be enabled first.', devices.length ? 'success' : 'warning');
}

async function connectWireless() {
  const address = $('wirelessAddress').value.trim();
  renderSeamlessStatus('Connecting wirelessly…', escapeHtml(address || 'No address supplied.'));
  const result = await window.studio.adbConnectWireless(address);
  renderSeamlessStatus(result?.ok ? 'Wireless ADB connected' : 'Wireless connection failed',
    escapeHtml(result?.stdout || result?.message || result?.stderr || ''), result?.ok ? 'success' : 'error-text');
}

async function deployAppOneClick() {
  renderSeamlessStatus('Deploying FriendshipTree…', 'Build → Capacitor sync → APK build → phone installation. This can take several minutes.');
  const result = await window.studio.deployAppOneClick();
  const stages = (result?.stages || []).map(s => `${s.ok ? '✓' : '✕'} ${escapeHtml(s.name)}${s.message ? ` — ${escapeHtml(s.message)}` : ''}`).join('<br>');
  renderSeamlessStatus(result?.ok ? 'FriendshipTree installed' : 'Deployment stopped',
    `${stages}${result?.message ? `<br><b>${escapeHtml(result.message)}</b>` : ''}${result?.apk ? `<br>APK: ${escapeHtml(result.apk)}` : ''}`,
    result?.ok ? 'success' : 'error-text');
}

async function publishApkFree() {
  renderSeamlessStatus('Publishing APK…', 'Copying the latest APK to a synced folder.');
  const result = await window.studio.publishApkFree();
  if (result?.canceled) return renderSeamlessStatus('Cancelled', 'No folder was selected.', 'muted');
  renderSeamlessStatus(result?.ok ? 'APK published' : 'Publishing failed',
    result?.ok ? `${escapeHtml(result.path)}<br>SHA-256: ${escapeHtml(result.sha256)}` : escapeHtml(result?.message || 'Unknown error'),
    result?.ok ? 'success' : 'error-text');
}


$('exportAiSync').onclick = exportAiSyncPackage;
$('deployAppOneClick').onclick = deployAppOneClick;
$('publishApkFree').onclick = publishApkFree;
$('connectWireless').onclick = connectWireless;
$('checkDevices').onclick = checkDevices;
const openUpdateInboxButton = $('openUpdateInbox');
if (openUpdateInboxButton) openUpdateInboxButton.onclick = () => window.studio.openUpdateInbox();
const scanUpdateInboxButton = $('scanUpdateInbox');
if (scanUpdateInboxButton) scanUpdateInboxButton.onclick = async () => {
  renderAutomaticUpdateEvent({ status:'detected', file:'Checking existing files…' });
  await window.studio.scanUpdateInboxNow();
};
window.studio.onUpdateInboxEvent(renderAutomaticUpdateEvent);
initialiseUpdateInbox().catch(() => {});
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

window.studio.appInfo()
  .then(info => {
    const version = String(info?.version || '2.14.3');
    $('studioVersion').textContent = 'v' + version;
    document.title = `FriendshipTree Studio v${version}`;
  })
  .catch(() => {
    $('studioVersion').textContent = 'v2.14.3';
    document.title = 'FriendshipTree Studio v2.14.3';
  });
// Keep first paint and navigation responsive. Project intelligence is useful, but
// none of it is required before the Home page can be used. Run these jobs one at
// a time after the browser has painted the interface instead of firing five IPC
// and filesystem-heavy jobs together during startup.
function scheduleStudioBackgroundStartup() {
  const jobs = [
    ['Recovery points', () => refreshRecovery()],
    ['Development Partner', () => renderDevelopmentPartner()],
    ['Project knowledge', () => renderProjectKnowledge(false)],
    ['Project DNA', () => renderProjectDNA(false)],
    ['AI Workspace', () => loadAIWorkspace(false)]
  ];

  const runNext = () => {
    const job = jobs.shift();
    if (!job) {
      document.documentElement.dataset.backgroundStartup = 'complete';
      return;
    }
    Promise.resolve()
      .then(job[1])
      .catch(error => console.warn(`Background startup job failed: ${job[0]}`, error))
      .finally(() => setTimeout(runNext, 120));
  };

  const begin = () => {
    document.documentElement.dataset.backgroundStartup = 'running';
    setTimeout(runNext, 250);
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(begin, { timeout: 1200 });
  } else {
    setTimeout(begin, 700);
  }
}

requestAnimationFrame(() => {
  document.documentElement.dataset.rendererReady = 'true';
  scheduleStudioBackgroundStartup();
});



function formatBrainBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function renderBrainBars(targetId, values) {
  const target = $(targetId);
  if (!target) return;
  const entries = Object.entries(values || {}).sort((a, b) => b[1] - a[1]);
  const maximum = Math.max(1, ...entries.map(([, value]) => Number(value || 0)));
  target.innerHTML = entries.length ? entries.map(([label, value]) => `
    <div class="brain-bar-row">
      <div class="brain-bar-label"><span>${escapeHtml(label)}</span><b>${Number(value || 0).toLocaleString()}</b></div>
      <div class="brain-bar-track"><span style="width:${Math.max(2, (Number(value || 0) / maximum) * 100)}%"></span></div>
    </div>`).join('') : '<p class="muted">No data available.</p>';
}

let selectedBrainPath = '';
let selectedBrainData = null;
let brainRelationFilter = 'all';
const brainNavigationHistory = [];
let brainNavigationIndex = -1;
let activeBrainFilter = 'search';
let brainSuggestionTimer = null;
let brainSuggestionRequest = 0;
let brainSuggestionIndex = -1;
let brainSuggestionRows = [];

function brainResultButton(item) {
  const description = item.description ? `<span class="brain-result-description">${escapeHtml(item.description)}</span>` : '';
  return `<button class="brain-result-row" data-brain-select="${escapeHtml(item.path || '')}">
    <span class="brain-result-main">
      <b>${escapeHtml(item.name || item.path || 'Unknown file')}</b>
      <code>${escapeHtml(item.path || '')}</code>
      ${description}
    </span>
    <span class="brain-result-meta">
      <em>${escapeHtml(item.owner || 'Unknown')}</em>
      <small>${escapeHtml(item.state || 'active')}</small>
    </span>
  </button>`;
}


function closeBrainSuggestions() {
  const box = $('brainSearchSuggestions');
  const input = $('brainSearchInput');
  if (box) {
    box.hidden = true;
    box.innerHTML = '';
  }
  if (input) {
    input.setAttribute('aria-expanded', 'false');
    input.removeAttribute('aria-activedescendant');
  }
  brainSuggestionIndex = -1;
  brainSuggestionRows = [];
}

function setActiveBrainSuggestion(index) {
  const box = $('brainSearchSuggestions');
  const input = $('brainSearchInput');
  if (!box || !brainSuggestionRows.length) return;
  brainSuggestionIndex = Math.max(0, Math.min(index, brainSuggestionRows.length - 1));
  box.querySelectorAll('[data-brain-suggestion]').forEach((row, rowIndex) => {
    const active = rowIndex === brainSuggestionIndex;
    row.classList.toggle('active', active);
    row.setAttribute('aria-selected', active ? 'true' : 'false');
    if (active) {
      input?.setAttribute('aria-activedescendant', row.id);
      row.scrollIntoView({ block: 'nearest' });
    }
  });
}

function chooseBrainSuggestion(item) {
  if (!item?.path) return;
  const input = $('brainSearchInput');
  if (input) input.value = item.name || item.path;
  closeBrainSuggestions();
  loadBrainFile(item.path);
}

function renderBrainSuggestions(items, query) {
  const box = $('brainSearchSuggestions');
  const input = $('brainSearchInput');
  if (!box || !input) return;

  brainSuggestionRows = (items || []).slice(0, 10);
  brainSuggestionIndex = -1;

  if (!brainSuggestionRows.length) {
    box.innerHTML = `<div class="brain-suggestion-empty">No suggestions for “${escapeHtml(query)}”. Press Enter for a full search.</div>`;
    box.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    return;
  }

  box.innerHTML = brainSuggestionRows.map((item, index) => `
    <button id="brainSuggestion${index}" class="brain-search-suggestion" type="button"
      role="option" aria-selected="false" data-brain-suggestion="${index}">
      <span class="brain-suggestion-icon">📄</span>
      <span class="brain-suggestion-text">
        <b>${escapeHtml(item.name || brainShortName(item.path))}</b>
        <code>${escapeHtml(item.path || '')}</code>
      </span>
      <span class="brain-suggestion-meta">
        <em>${escapeHtml(item.owner || 'Unknown')}</em>
        <small>${escapeHtml(item.state || 'active')}</small>
      </span>
    </button>`).join('');

  box.hidden = false;
  input.setAttribute('aria-expanded', 'true');
  box.querySelectorAll('[data-brain-suggestion]').forEach(button => {
    const index = Number(button.dataset.brainSuggestion);
    button.addEventListener('mouseenter', () => setActiveBrainSuggestion(index));
    button.addEventListener('mousedown', event => {
      event.preventDefault();
      chooseBrainSuggestion(brainSuggestionRows[index]);
    });
  });
}

async function loadBrainSuggestions() {
  const input = $('brainSearchInput');
  if (!input) return;
  const query = input.value.trim();
  if (query.length < 2 || activeBrainFilter !== 'search') {
    closeBrainSuggestions();
    return;
  }

  const requestId = ++brainSuggestionRequest;
  try {
    const result = await window.studio.searchProjectBrain(query, 'search', 20);
    if (requestId !== brainSuggestionRequest) return;
    if (!result?.ok) {
      closeBrainSuggestions();
      return;
    }

    const lowered = query.toLowerCase();
    const sorted = [...(result.results || [])].sort((a, b) => {
      const aName = String(a.name || '').toLowerCase();
      const bName = String(b.name || '').toLowerCase();
      const aPath = String(a.path || '').toLowerCase();
      const bPath = String(b.path || '').toLowerCase();
      const rank = (name, path) => {
        if (name === lowered) return 0;
        if (name.startsWith(lowered)) return 1;
        if (name.includes(lowered)) return 2;
        if (path.startsWith(lowered)) return 3;
        if (path.includes(lowered)) return 4;
        return 5;
      };
      const difference = rank(aName, aPath) - rank(bName, bPath);
      return difference || aName.localeCompare(bName) || aPath.localeCompare(bPath);
    });

    renderBrainSuggestions(sorted, query);
  } catch {
    if (requestId === brainSuggestionRequest) closeBrainSuggestions();
  }
}

function queueBrainSuggestions() {
  clearTimeout(brainSuggestionTimer);
  brainSuggestionTimer = setTimeout(loadBrainSuggestions, 180);
}

async function runBrainSearch(mode = activeBrainFilter) {
  closeBrainSuggestions();
  activeBrainFilter = mode;
  document.querySelectorAll('[data-brain-filter]').forEach(button => {
    button.classList.toggle('active', button.dataset.brainFilter === mode);
  });
  const input = $('brainSearchInput');
  const term = input ? input.value.trim() : '';
  const meta = $('brainSearchMeta');
  const target = $('brainSearchResults');
  if (!target || !meta) return;
  if (mode === 'search' && !term) {
    meta.textContent = 'Enter a filename, path or component.';
    target.innerHTML = '';
    return;
  }
  meta.textContent = mode === 'search' ? `Searching for “${term}”…` : `Loading ${mode} files…`;
  target.innerHTML = '<div class="brain-result-loading">Reading Project Brain…</div>';
  try {
    const result = await window.studio.searchProjectBrain(term, mode, 250);
    if (!result?.ok) throw new Error(result?.message || 'Search failed.');
    meta.textContent = `${Number(result.count || 0).toLocaleString()} ${mode === 'search' ? 'matches' : mode}`;
    target.innerHTML = (result.results || []).length
      ? result.results.map(brainResultButton).join('')
      : '<div class="brain-empty-list">No matching files were found.</div>';
    target.querySelectorAll('[data-brain-select]').forEach(button => {
      button.onclick = () => loadBrainFile(button.dataset.brainSelect || '');
    });
  } catch (error) {
    meta.textContent = 'Search failed';
    target.innerHTML = `<div class="status-box error-text">${escapeHtml(error.message)}</div>`;
  }
}

function renderBrainRelations(targetId, relations, direction) {
  const target = $(targetId);
  if (!target) return;
  const relevant = (relations || []).filter(item => item.resolution !== 'external-package' && item.resolution !== 'external-module');
  if (!relevant.length) {
    target.innerHTML = '<p class="muted">No resolved local relationships.</p>';
    return;
  }
  target.innerHTML = relevant.slice(0, 100).map(item => {
    const path = direction === 'out' ? (item.targetPath || item.specifier) : item.sourcePath;
    const owner = direction === 'out' ? item.targetOwner : item.sourceOwner;
    return `<button class="brain-relation-row" data-brain-select="${escapeHtml(path || '')}">
      <span><b>${escapeHtml(String(path || 'Unknown').split('/').pop())}</b><code>${escapeHtml(path || '')}</code></span>
      <span><em>${escapeHtml(owner || 'Unknown')}</em><small>${escapeHtml(item.relationType || 'reference')}</small></span>
    </button>`;
  }).join('');
  target.querySelectorAll('[data-brain-select]').forEach(button => {
    button.onclick = () => loadBrainFile(button.dataset.brainSelect || '');
  });
}


function brainShortName(path) {
  const value = String(path || '');
  return value.split(/[\\/]/).pop() || value;
}

function relationMatchesBrainFilter(relation) {
  if (brainRelationFilter === 'all') return true;
  return String(relation?.relationType || '').toLowerCase() === brainRelationFilter;
}

function updateBrainNavigationButtons() {
  const back = $('brainBackButton');
  const forward = $('brainForwardButton');
  if (back) back.disabled = brainNavigationIndex <= 0;
  if (forward) forward.disabled = brainNavigationIndex < 0 || brainNavigationIndex >= brainNavigationHistory.length - 1;
}

function rememberBrainNavigation(path) {
  if (!path) return;
  if (brainNavigationHistory[brainNavigationIndex] === path) {
    updateBrainNavigationButtons();
    return;
  }
  brainNavigationHistory.splice(brainNavigationIndex + 1);
  brainNavigationHistory.push(path);
  brainNavigationIndex = brainNavigationHistory.length - 1;
  if (brainNavigationHistory.length > 50) {
    brainNavigationHistory.shift();
    brainNavigationIndex -= 1;
  }
  updateBrainNavigationButtons();
}

function renderBrainDependencyGraph(result) {
  const target = $('brainDependencyGraph');
  if (!target) return;
  const dependencies = (result.dependencies || [])
    .filter(item => item.resolution !== 'external-package' && item.resolution !== 'external-module')
    .filter(relationMatchesBrainFilter)
    .slice(0, 8);
  const dependents = (result.dependents || [])
    .filter(item => item.resolution !== 'external-package' && item.resolution !== 'external-module')
    .filter(relationMatchesBrainFilter)
    .slice(0, 8);

  const width = 900;
  const rowGap = 58;
  const rows = Math.max(dependencies.length, dependents.length, 1);
  const height = Math.max(280, 110 + rows * rowGap);
  const centerX = width / 2;
  const centerY = height / 2;
  const leftX = 155;
  const rightX = width - 155;

  const incomingNodes = dependents.map((item, index) => ({
    path: item.sourcePath,
    owner: item.sourceOwner || 'Unknown',
    relationType: item.relationType || 'reference',
    x: leftX,
    y: centerY - ((dependents.length - 1) * rowGap) / 2 + index * rowGap,
    kind: 'incoming'
  }));
  const outgoingNodes = dependencies.map((item, index) => ({
    path: item.targetPath || item.specifier,
    owner: item.targetOwner || 'Unknown',
    relationType: item.relationType || 'reference',
    x: rightX,
    y: centerY - ((dependencies.length - 1) * rowGap) / 2 + index * rowGap,
    kind: 'outgoing'
  }));

  const edge = (item, incoming) => {
    const x1 = incoming ? item.x + 105 : centerX + 115;
    const x2 = incoming ? centerX - 115 : item.x - 105;
    const y1 = item.y;
    const y2 = centerY;
    const mid = (x1 + x2) / 2;
    return `<path class="brain-graph-edge ${item.kind}" d="M ${x1} ${y1} C ${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}" />
      <text class="brain-graph-edge-label" x="${mid}" y="${(y1 + y2) / 2 - 5}" text-anchor="middle">${escapeHtml(item.relationType)}</text>`;
  };

  const node = item => `<g class="brain-graph-node ${item.kind}" data-brain-select="${escapeHtml(item.path || '')}" transform="translate(${item.x - 105},${item.y - 23})" tabindex="0" role="button">
      <rect width="210" height="46" rx="12"></rect>
      <text x="105" y="19" text-anchor="middle" class="brain-graph-node-name">${escapeHtml(brainShortName(item.path))}</text>
      <text x="105" y="35" text-anchor="middle" class="brain-graph-node-owner">${escapeHtml(item.owner)}</text>
    </g>`;

  target.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img">
    <defs>
      <marker id="brainArrowIncoming" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z"></path></marker>
      <marker id="brainArrowOutgoing" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L0,6 L6,3 z"></path></marker>
    </defs>
    ${incomingNodes.map(item => edge(item, true)).join('')}
    ${outgoingNodes.map(item => edge(item, false)).join('')}
    ${incomingNodes.map(node).join('')}
    ${outgoingNodes.map(node).join('')}
    <g class="brain-graph-node selected" transform="translate(${centerX - 115},${centerY - 28})">
      <rect width="230" height="56" rx="14"></rect>
      <text x="115" y="23" text-anchor="middle" class="brain-graph-node-name">${escapeHtml(brainShortName(result.file.path))}</text>
      <text x="115" y="42" text-anchor="middle" class="brain-graph-node-owner">${escapeHtml(result.file.owner || 'Unknown')}</text>
    </g>
  </svg>
  ${(!incomingNodes.length && !outgoingNodes.length) ? '<div class="brain-graph-empty">No local relationships match this filter.</div>' : ''}`;

  target.querySelectorAll('[data-brain-select]').forEach(element => {
    const activate = () => loadBrainFile(element.dataset.brainSelect || '');
    element.addEventListener('click', activate);
    element.addEventListener('keydown', event => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        activate();
      }
    });
  });
}

async function loadBrainFile(path, options = {}) {
  if (!path) return;
  try {
    const result = await window.studio.getProjectBrainFile(path);
    if (!result?.ok) throw new Error(result?.message || 'File could not be loaded.');
    selectedBrainPath = result.file.path;
    selectedBrainData = result;
    if (!options.fromHistory) rememberBrainNavigation(result.file.path);
    $('brainEmptyDetail').hidden = true;
    $('brainFileDetail').hidden = false;
    $('brainFileName').textContent = result.file.name || result.file.path.split('/').pop();
    $('brainFilePath').textContent = result.file.path;
    $('brainFileOwner').textContent = result.file.owner || 'Unknown';
    $('brainFileFacts').innerHTML = [
      ['State', result.file.state || 'active'],
      ['Size', formatBrainBytes(result.file.sizeBytes)],
      ['Extension', result.file.extension || 'none'],
      ['Dependencies', (result.dependencies || []).length],
      ['Used by', (result.dependents || []).length],
      ['Modified', result.file.modifiedMs ? new Date(result.file.modifiedMs).toLocaleString() : 'Unknown']
    ].map(([label, value]) => `<div><span>${escapeHtml(label)}</span><b>${escapeHtml(String(value))}</b></div>`).join('');
    $('brainImpactRisk').textContent = result.impact?.risk || 'LOW';
    $('brainImpactRisk').className = `brain-risk-${String(result.impact?.risk || 'LOW').toLowerCase()}`;
    $('brainImpactCount').textContent = Number(result.impact?.affected || 0).toLocaleString();
    renderBrainRelations('brainDependencies', result.dependencies, 'out');
    renderBrainRelations('brainDependents', result.dependents, 'in');
    renderBrainDependencyGraph(result);
    $('brainImpactLevels').innerHTML = (result.impact?.levels || []).length
      ? result.impact.levels.map((level, index) => `<div class="brain-impact-level"><b>Level ${index + 1}</b><div>${level.map(item => `<button data-brain-select="${escapeHtml(item)}">${escapeHtml(item)}</button>`).join('')}</div></div>`).join('')
      : '<p class="muted">No downstream files were found.</p>';
    $('brainImpactLevels').querySelectorAll('[data-brain-select]').forEach(button => {
      button.onclick = () => loadBrainFile(button.dataset.brainSelect || '');
    });
  } catch (error) {
    $('brainEmptyDetail').hidden = false;
    $('brainFileDetail').hidden = true;
    $('brainEmptyDetail').innerHTML = `<div class="brain-empty-icon">⚠</div><h3>Could not load file</h3><p class="error-text">${escapeHtml(error.message)}</p>`;
  }
}

async function loadProjectBrain() {
  const status = $('brainStatus');
  if (!status) return;
  status.className = 'status-box muted';
  status.textContent = 'Reading the Project Brain database…';
  try {
    const brain = await window.studio.getProjectBrain();
    if (!brain?.ok) throw new Error(brain?.message || 'Project Brain unavailable.');
    status.className = 'status-box success';
    status.innerHTML = `<b>Project Brain Explorer ready</b><div>Powered by ${escapeHtml(brain.querySource || 'Project Brain')} ${brain.queryEngineVersion ? `v${escapeHtml(brain.queryEngineVersion)}` : ''} · Schema ${escapeHtml(String(brain.schemaVersion || '?'))} · ${formatBrainBytes(brain.databaseBytes)}</div>`;
    const completed = brain.completedAt ? new Date(brain.completedAt) : null;
    $('brainFreshness').textContent = completed && !Number.isNaN(completed.getTime()) ? `Last scan ${completed.toLocaleString()}` : 'Scan time unavailable';
    const cards = [
      ['Indexed files', brain.totals.files],
      ['Dependencies', brain.totals.relationships],
      ['Resolved local', brain.totals.resolved],
      ['Unresolved', brain.totals.unresolved],
      ['Unknown files', brain.totals.unknownFiles],
      ['Resolution rate', `${Number(brain.resolutionRate || 0).toFixed(1)}%`]
    ];
    $('brainOverview').innerHTML = cards.map(([label, value]) => `<article class="brain-stat-card"><strong>${typeof value === 'number' ? Number(value).toLocaleString() : escapeHtml(String(value))}</strong><span>${escapeHtml(label)}</span></article>`).join('');
    renderBrainBars('brainOwners', brain.byOwner);
    renderBrainBars('brainStates', brain.byState);
    $('brainRelationships').innerHTML = (brain.strongestRelationships || []).length
      ? `<div class="brain-table"><div class="brain-table-head"><span>Source</span><span>Relationship</span><span>Target</span><span>Count</span></div>${brain.strongestRelationships.map(item => `<div class="brain-table-row"><span>${escapeHtml(item.source)}</span><span>${escapeHtml(item.type)}</span><span>${escapeHtml(item.target)}</span><b>${Number(item.count || 0).toLocaleString()}</b></div>`).join('')}</div>`
      : '<p class="muted">No relationships were recorded.</p>';
    window.StudioEvents?.emit('brain.ready', { message: `${Number(brain.totals?.files || 0).toLocaleString()} files and ${Number(brain.totals?.relationships || 0).toLocaleString()} relationships loaded.` });
  } catch (error) {
    status.className = 'status-box error-text';
    status.innerHTML = `<b>Project Brain failed to load</b><div>${escapeHtml(error.message)}</div>`;
    window.StudioEvents?.emit('brain.failed', { message: error.message });
  }
}


function normaliseStudioSearchText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

// Legacy entry points now delegate to the independent Universal Search Engine.
// Keeping these names avoids breaking older Studio buttons and hotkeys.
function clearStudioGlobalSearch() {
  if (window.universalStudioSearch) {
    window.universalStudioSearch.clear();
    return;
  }
  const input = $('studioGlobalSearchInput');
  if (input) input.value = '';
}

function runStudioGlobalSearch() {
  if (window.universalStudioSearch) {
    window.universalStudioSearch.search($('studioGlobalSearchInput')?.value || '');
  }
}

const studioGlobalSearchInput = $('studioGlobalSearchInput');
const clearStudioGlobalSearchButton = $('clearStudioGlobalSearch');
if (studioGlobalSearchInput) {
  studioGlobalSearchInput.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !window.universalStudioSearch) clearStudioGlobalSearch();
  });
}
if (clearStudioGlobalSearchButton) clearStudioGlobalSearchButton.addEventListener('click', () => {
  clearStudioGlobalSearch();
  studioGlobalSearchInput?.focus();
});


// Runtime marker used by the 2.10.2 snap/search update.
document.documentElement.dataset.rendererReady = 'true';

// Developer Hub navigation and Home dashboard (V2.8)
const PAGE_META = {
  home: ['Developer Hub', 'Home', 'Your current project state and the actions you use most.'],
  build: ['Android workflow', 'Build & Deploy', 'Build, sync, install and publish FriendshipTree.'],
  updates: ['Package management', 'Updates', 'Inspect and install verified FriendshipTree update packages.'],
  project: ['Project intelligence', 'Project', 'Explore the current source, manifests and project knowledge.'],
  source: ['Version control', 'Source Control', 'Review Git status, history and synchronisation with GitHub.'],
  brain: ['Dependency intelligence', 'Project Brain Explorer', 'Search files, inspect dependencies and understand change impact.'],
  developer: ['System visibility', 'Developer Diagnostics Centre', 'Monitor Studio activity, test subsystems and diagnose failures.'],
  ai: ['AI development', 'AI Workspace', 'Generate current context and development packages for AI collaboration.'],
  maintenance: ['Safe housekeeping', 'Maintenance', 'Organise, clean and recover without destructive file deletion.'],
  diagnostics: ['Evidence and testing', 'Diagnostics', 'Measure project health, dependencies, tests and live activity.']
};

function switchStudioPage(page, options = {}) {
  const target = PAGE_META[page] ? page : 'home';
  document.querySelectorAll('[data-page]').forEach(panel => {
    panel.hidden = panel.dataset.page !== target;
  });
  document.querySelectorAll('[data-nav-page]').forEach(button => {
    button.classList.toggle('active', button.dataset.navPage === target);
  });
  const [eyebrow, title, subtitle] = PAGE_META[target];
  $('pageEyebrow').textContent = eyebrow;
  $('pageTitle').textContent = title;
  $('pageSubtitle').textContent = subtitle;
  document.body.dataset.activePage = target;
  if (!options.keepScroll) window.scrollTo({ top: 0, behavior: options.instant ? 'auto' : 'smooth' });
}

function setHomeActionStatus(title, detail, kind = '') {
  const box = $('homeActionStatus');
  if (!box) return;
  box.className = `status-box ${kind}`.trim();
  box.innerHTML = `<b>${escapeHtml(title)}</b><div>${escapeHtml(detail || '')}</div>`;
}

async function runHomeAction(label, action) {
  setHomeActionStatus(label, 'Working…');
  try {
    const result = await action();
    if (result?.canceled) return setHomeActionStatus('Cancelled', 'No changes were made.', 'muted');
    if (result?.ok === false) {
      const message = result.message || 'Unknown error';
      setHomeActionStatus(`${label} failed`, message, 'error-text');
      window.StudioEvents?.emit('task.failed', { title: `${label} failed`, message, source: 'Home quick actions', page: 'home' });
      return;
    }
    const message = result?.path || result?.message || 'Finished successfully.';
    setHomeActionStatus(`${label} complete`, message, 'success');
    window.StudioEvents?.emit('task.complete', { title: `${label} complete`, message, source: 'Home quick actions', page: 'home' });
    await refreshHomeDashboard();
  } catch (error) {
    setHomeActionStatus(`${label} failed`, error.message, 'error-text');
    window.StudioEvents?.emit('task.failed', { title: `${label} failed`, message: error.message, source: 'Home quick actions', page: 'home' });
  }
}

async function refreshHomeDashboard() {
  const statusTarget = $('homeProjectStatus');
  try {
    const status = await window.studio.status();
    const rows = [
      ['Project folder', status.project],
      ['Studio', status.studio],
      ['Android tools', Boolean(status.adb && status.java)],
      ['Google Drive', status.drive],
      ['Reports', Boolean(status.reports)]
    ];
    statusTarget.innerHTML = rows.map(([name, good]) =>
      `<div class="home-status-row"><span class="status-dot ${good ? 'good' : 'bad'}"></span><span>${escapeHtml(name)}</span><b>${good ? 'Ready' : 'Needs attention'}</b></div>`
    ).join('');
  } catch (error) {
    statusTarget.innerHTML = `<p class="error-text">${escapeHtml(error.message)}</p>`;
  }

  try {
    const health = await window.studio.projectHealth();
    const orb = $('homeHealthOrb');
    orb.querySelector('strong').textContent = Number.isFinite(health.score) ? `${health.score}%` : '—';
    orb.title = health.grade || 'Project health';
  } catch {}
}

document.querySelectorAll('[data-nav-page]').forEach(button => {
  button.addEventListener('click', () => {
    switchStudioPage(button.dataset.navPage);
    if (button.dataset.navPage === 'brain') loadProjectBrain();
    if (button.dataset.navPage === 'developer') refreshDeveloperCentre();
    if (button.dataset.navPage === 'source') refreshGitOverview();
  });
});
document.querySelectorAll('[data-go-page]').forEach(button => {
  button.addEventListener('click', () => {
    switchStudioPage(button.dataset.goPage);
    if (button.dataset.goPage === 'brain') loadProjectBrain();
    if (button.dataset.goPage === 'developer') refreshDeveloperCentre();
    if (button.dataset.goPage === 'source') refreshGitOverview();
  });
});

$('sidebarOpenProject').onclick = () => window.studio.openPath('C:\\Users\\Joe\\FriendshipTree');
$('sidebarOpenDocs').onclick = () => window.studio.openPath('C:\\Users\\Joe\\FriendshipTree\\Docs');
$('homeOpenDocs').onclick = () => window.studio.openPath('C:\\Users\\Joe\\FriendshipTree\\Docs');
$('homeOpenUpdates').onclick = () => {
  if (typeof window.studio.openUpdateInbox === 'function') return window.studio.openUpdateInbox();
  return window.studio.openPath('C:\\Users\\Joe\\FriendshipTree\\StudioSystem\\Updates\\Inbox');
};
$('homeDeploy').onclick = () => runHomeAction('Build and install', () => window.studio.deployAppOneClick());
$('homeBuildApk').onclick = () => runHomeAction('APK build', () => window.studio.buildApk());
$('homeExportAI').onclick = () => runHomeAction('AI context export', () => window.studio.exportAIPackage());
$('homeRunDoctor').onclick = () => runHomeAction('Doctor', () => window.studio.runDoctor());

const originalRefreshAll = $('refreshAll').onclick;
$('refreshAll').onclick = async () => {
  await Promise.all([
    refreshHomeDashboard(),
    calculateHealth(),
    refreshRecovery(),
    renderDevelopmentPartner()
  ]);
};


const loadProjectBrainButton = $('loadProjectBrain');
if (loadProjectBrainButton) loadProjectBrainButton.onclick = loadProjectBrain;
const openProjectBrainButton = $('openProjectBrainFolder');
if (openProjectBrainButton) openProjectBrainButton.onclick = () => window.studio.openProjectBrainFolder();

const brainBackButton = $('brainBackButton');
if (brainBackButton) brainBackButton.onclick = () => {
  if (brainNavigationIndex <= 0) return;
  brainNavigationIndex -= 1;
  updateBrainNavigationButtons();
  loadBrainFile(brainNavigationHistory[brainNavigationIndex], { fromHistory: true });
};
const brainForwardButton = $('brainForwardButton');
if (brainForwardButton) brainForwardButton.onclick = () => {
  if (brainNavigationIndex >= brainNavigationHistory.length - 1) return;
  brainNavigationIndex += 1;
  updateBrainNavigationButtons();
  loadBrainFile(brainNavigationHistory[brainNavigationIndex], { fromHistory: true });
};
document.querySelectorAll('[data-brain-relation-filter]').forEach(button => {
  button.onclick = () => {
    brainRelationFilter = button.dataset.brainRelationFilter || 'all';
    document.querySelectorAll('[data-brain-relation-filter]').forEach(item => {
      item.classList.toggle('active', item === button);
    });
    if (selectedBrainData) renderBrainDependencyGraph(selectedBrainData);
  };
});

const brainSearchButton = $('brainSearchButton');
if (brainSearchButton) brainSearchButton.onclick = () => runBrainSearch('search');
const brainSearchInput = $('brainSearchInput');
if (brainSearchInput) {
  brainSearchInput.addEventListener('input', queueBrainSuggestions);
  brainSearchInput.addEventListener('focus', () => {
    if (brainSearchInput.value.trim().length >= 2) queueBrainSuggestions();
  });
  brainSearchInput.addEventListener('keydown', event => {
    const box = $('brainSearchSuggestions');
    const open = box && !box.hidden;
    if (event.key === 'ArrowDown' && open && brainSuggestionRows.length) {
      event.preventDefault();
      setActiveBrainSuggestion(brainSuggestionIndex < 0 ? 0 : brainSuggestionIndex + 1);
      return;
    }
    if (event.key === 'ArrowUp' && open && brainSuggestionRows.length) {
      event.preventDefault();
      setActiveBrainSuggestion(brainSuggestionIndex < 0 ? brainSuggestionRows.length - 1 : brainSuggestionIndex - 1);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      if (open && brainSuggestionIndex >= 0 && brainSuggestionRows[brainSuggestionIndex]) {
        chooseBrainSuggestion(brainSuggestionRows[brainSuggestionIndex]);
      } else {
        runBrainSearch('search');
      }
      return;
    }
    if (event.key === 'Escape') {
      closeBrainSuggestions();
    }
  });
  brainSearchInput.addEventListener('blur', () => {
    setTimeout(() => {
      if (!document.activeElement?.closest?.('#brainSearchSuggestions')) closeBrainSuggestions();
    }, 120);
  });
}
document.querySelectorAll('[data-brain-filter]').forEach(button => {
  button.onclick = () => {
    closeBrainSuggestions();
    runBrainSearch(button.dataset.brainFilter || 'search');
  };
});
const brainOpenSelected = $('brainOpenSelected');
if (brainOpenSelected) brainOpenSelected.onclick = () => {
  if (!selectedBrainPath) return;
  const full = `C:\\Users\\Joe\\FriendshipTree\\${selectedBrainPath.replace(/\//g, '\\')}`;
  const folder = full.includes('\\') ? full.slice(0, full.lastIndexOf('\\')) : full;
  window.studio.openPath(folder);
};

switchStudioPage('home', { instant: true });
refreshHomeDashboard();


const forgeTestButton = $('createForgeTestPackage');
if (forgeTestButton) {
  forgeTestButton.onclick = async () => {
    forgeTestButton.disabled = true;
    const original = forgeTestButton.textContent;
    forgeTestButton.textContent = 'Creating verified test package…';
    try {
      const result = await window.studio.createForgeTestPackage();
      if (!result?.ok) throw new Error(result?.message || 'The test package could not be created.');
      $('packageInspection').innerHTML = resultCard('Safe Forge test update created', `
        <p class="success">The package was written directly to the canonical Forge Inbox.</p>
        <div><b>Candidate:</b> ${escapeHtml(result.version)}</div>
        <div><b>Path:</b> <code>${escapeHtml(result.path)}</code></div>
        <p class="muted">Open Forge. It will detect this harmless isolated candidate automatically.</p>`);
    } catch (error) {
      $('packageInspection').innerHTML = resultCard('Test package creation failed',
        `<p class="error-text">${escapeHtml(error.message)}</p>`, 'package-invalid');
    } finally {
      forgeTestButton.disabled = false;
      forgeTestButton.textContent = original;
    }
  };
}


// FriendshipTree Studio 2.14.0 — Developer Diagnostics Centre
const DEVELOPER_ACTIVITY_KEY = 'friendshiptree-studio-developer-activity-v1';
let developerActivityFilter = 'all';
let developerLastResults = [];

function loadDeveloperActivity() {
  try {
    const parsed = JSON.parse(localStorage.getItem(DEVELOPER_ACTIVITY_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.slice(0, 250) : [];
  } catch {
    return [];
  }
}

let developerActivity = loadDeveloperActivity();

function saveDeveloperActivity() {
  try {
    localStorage.setItem(DEVELOPER_ACTIVITY_KEY, JSON.stringify(developerActivity.slice(0, 250)));
  } catch {}
}

function recordDeveloperActivity(type, title, detail = '', data = null) {
  const event = {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    time: new Date().toISOString(),
    type: type || 'action',
    title: String(title || 'Activity'),
    detail: String(detail || ''),
    data
  };
  developerActivity.unshift(event);
  developerActivity = developerActivity.slice(0, 250);
  saveDeveloperActivity();
  renderDeveloperActivity();
  return event;
}

function developerTime(value) {
  try {
    return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return '';
  }
}

function developerIcon(type) {
  return ({ success: '✓', warning: '!', error: '×', info: 'i', action: '→' })[type] || '•';
}

function renderDeveloperActivity() {
  const filtered = developerActivityFilter === 'all'
    ? developerActivity
    : developerActivity.filter(item => item.type === developerActivityFilter);

  const rowHtml = item => `
    <article class="developer-activity-item ${escapeHtml(item.type)}">
      <span class="developer-activity-icon">${developerIcon(item.type)}</span>
      <div class="developer-activity-copy">
        <div><b>${escapeHtml(item.title)}</b><time>${escapeHtml(developerTime(item.time))}</time></div>
        ${item.detail ? `<p>${escapeHtml(item.detail)}</p>` : ''}
      </div>
    </article>`;

  const timeline = $('developerActivityTimeline');
  if (timeline) timeline.innerHTML = filtered.length ? filtered.map(rowHtml).join('') : '<p class="muted">No matching activity yet.</p>';
  const preview = $('developerActivityPreview');
  if (preview) preview.innerHTML = developerActivity.length ? developerActivity.slice(0, 6).map(rowHtml).join('') : '<p class="muted">Actions and checks will appear here.</p>';
  const count = $('developerActivityCount');
  if (count) count.textContent = `${filtered.length} event${filtered.length === 1 ? '' : 's'}`;
}

function setDeveloperTab(tab) {
  document.querySelectorAll('[data-developer-tab]').forEach(button => button.classList.toggle('active', button.dataset.developerTab === tab));
  document.querySelectorAll('[data-developer-panel]').forEach(panel => panel.hidden = panel.dataset.developerPanel !== tab);
}

function statusClass(ok, warning = false) {
  return ok ? 'healthy' : warning ? 'warning' : 'failed';
}

function renderDeveloperSubsystems(results) {
  const grid = $('developerSubsystemGrid');
  if (!grid) return;
  const mapping = [
    ['Studio renderer', 'renderer'],
    ['IPC bridge', 'ipc'],
    ['Project Brain', 'brain'],
    ['Query Engine', 'engine'],
    ['Search', 'search'],
    ['Dependency inspection', 'dependency']
  ];
  grid.innerHTML = mapping.map(([label, key]) => {
    const result = results.find(item => item.key === key);
    const cls = result ? statusClass(result.ok, result.warning) : 'pending';
    return `<article class="developer-subsystem-card ${cls}">
      <span class="developer-status-light"></span>
      <div><b>${escapeHtml(label)}</b><small>${escapeHtml(result?.summary || 'Waiting for check')}</small></div>
      ${result?.duration != null ? `<em>${Math.round(result.duration)} ms</em>` : ''}
    </article>`;
  }).join('');
}

function renderDeveloperTests(results) {
  const target = $('developerTestResults');
  if (!target) return;
  if (!results.length) {
    target.innerHTML = '<p class="muted">Run the full health check to begin.</p>';
    return;
  }
  target.innerHTML = results.map((result, index) => `
    <details class="developer-test-row ${statusClass(result.ok, result.warning)}" ${!result.ok ? 'open' : ''}>
      <summary>
        <span class="developer-test-state">${result.ok ? '✓' : result.warning ? '!' : '×'}</span>
        <b>${escapeHtml(result.name)}</b>
        <span>${escapeHtml(result.summary)}</span>
        <em>${Math.round(result.duration || 0)} ms</em>
      </summary>
      <pre>${escapeHtml(JSON.stringify(result.detail ?? {}, null, 2))}</pre>
    </details>`).join('');
}

function renderDeveloperFindings(results) {
  const target = $('developerFindings');
  if (!target) return;
  const problems = results.filter(result => !result.ok);
  if (!problems.length && results.length) {
    target.innerHTML = '<div class="developer-finding success"><b>No faults detected</b><p>All tested subsystems returned a valid response.</p></div>';
    return;
  }
  if (!results.length) {
    target.innerHTML = '<p class="muted">No test results yet.</p>';
    return;
  }
  target.innerHTML = problems.map(result => `
    <div class="developer-finding ${result.warning ? 'warning' : 'error'}">
      <b>${escapeHtml(result.name)}</b>
      <p>${escapeHtml(result.explanation || result.summary)}</p>
      ${result.repair ? `<button class="secondary-button" data-developer-repair="${escapeHtml(result.repair)}">${escapeHtml(result.repairLabel || 'Try repair')}</button>` : ''}
    </div>`).join('');
}

async function timedDeveloperCheck(key, name, task) {
  const started = performance.now();
  try {
    const value = await task();
    const duration = performance.now() - started;
    return {
      key, name, ok: value?.ok !== false, warning: Boolean(value?.warning),
      summary: value?.summary || 'Passed',
      explanation: value?.explanation || '',
      detail: value?.detail ?? value,
      duration,
      repair: value?.repair,
      repairLabel: value?.repairLabel
    };
  } catch (error) {
    return {
      key, name, ok: false, warning: false,
      summary: error.message || 'Check failed',
      explanation: `The ${name} check threw an error before it completed.`,
      detail: { name: error.name, message: error.message, stack: error.stack },
      duration: performance.now() - started
    };
  }
}

async function runDeveloperHealthCheck() {
  const button = $('runDeveloperChecks');
  if (button) {
    button.disabled = true;
    button.textContent = 'Running checks…';
  }
  recordDeveloperActivity('action', 'Full developer health check started', 'Testing renderer, IPC, Project Brain, search and dependencies.');

  const results = [];
  results.push(await timedDeveloperCheck('renderer', 'Studio renderer', async () => ({
    ok: document.documentElement.dataset.rendererReady === 'true',
    summary: document.documentElement.dataset.rendererReady === 'true' ? 'Renderer ready' : 'Renderer marker missing',
    detail: {
      readyMarker: document.documentElement.dataset.rendererReady || null,
      activePage: document.body.dataset.activePage || null,
      version: $('studioVersion')?.textContent || null
    }
  })));

  results.push(await timedDeveloperCheck('ipc', 'IPC bridge', async () => {
    if (!window.studio || typeof window.studio.status !== 'function') {
      return { ok: false, summary: 'Studio API unavailable', explanation: 'The renderer cannot see the preload IPC bridge.' };
    }
    const response = await window.studio.status();
    return {
      ok: Boolean(response),
      summary: response ? 'IPC responding' : 'No response',
      detail: response
    };
  }));

  results.push(await timedDeveloperCheck('brain', 'Project Brain database', async () => {
    if (typeof window.studio?.getProjectBrain !== 'function') {
      return { ok: false, summary: 'Project Brain API unavailable', explanation: 'The preload bridge does not expose getProjectBrain.' };
    }
    const response = await window.studio.getProjectBrain();
    const count = Number(response?.summary?.files ?? response?.files ?? response?.totals?.files ?? 0);
    return {
      ok: Boolean(response?.ok) && count > 0,
      warning: Boolean(response?.ok) && count === 0,
      summary: response?.ok ? `${count || 'No'} files reported` : (response?.message || 'Brain failed to load'),
      explanation: count === 0 ? 'The Project Brain responded but did not report indexed files.' : '',
      detail: response,
      repair: count === 0 ? 'refresh-brain' : null,
      repairLabel: 'Refresh Brain'
    };
  }));

  results.push(await timedDeveloperCheck('engine', 'Phase 3 Query Engine', async () => {
    const response = await window.studio.getProjectBrain();
    const version = response?.engine?.version || response?.queryEngineVersion || response?.version || '';
    const powered = response?.poweredBy || response?.engine?.name || '';
    const recognised = String(version).includes('3.1') || String(powered).toLowerCase().includes('query');
    return {
      ok: Boolean(response?.ok) && recognised,
      warning: Boolean(response?.ok) && !recognised,
      summary: recognised ? `Query Engine ${version || 'connected'}` : 'Engine responded but version was not identified',
      detail: { version, poweredBy: powered, response }
    };
  }));

  results.push(await timedDeveloperCheck('search', 'Project Brain search', async () => {
    if (typeof window.studio?.searchProjectBrain !== 'function') {
      return { ok: false, summary: 'Search API unavailable', explanation: 'The preload bridge does not expose searchProjectBrain.' };
    }
    const response = await window.studio.searchProjectBrain('app', 'search', 20);
    const matches = Array.isArray(response?.results) ? response.results.length : 0;
    return {
      ok: Boolean(response?.ok) && matches > 0,
      warning: Boolean(response?.ok) && matches === 0,
      summary: response?.ok ? `${matches} matches for “app”` : (response?.message || 'Search request failed'),
      explanation: response?.ok && matches === 0
        ? 'The renderer and IPC call worked, but the Query Engine returned no matches. Studio 2.14.0 repairs the CLI argument parser that previously appended the project-root path to every search term.'
        : '',
      detail: response,
      repair: matches === 0 ? 'refresh-brain' : null,
      repairLabel: 'Refresh Brain'
    };
  }));

  results.push(await timedDeveloperCheck('dependency', 'Dependency inspection', async () => {
    const search = await window.studio.searchProjectBrain('renderer', 'search', 5);
    const first = search?.results?.[0];
    if (!first?.path) {
      return {
        ok: false, warning: true,
        summary: 'No file available to inspect',
        explanation: 'Dependency inspection could not be tested because search did not return a file.',
        detail: search
      };
    }
    const response = await window.studio.getProjectBrainFile(first.path);
    return {
      ok: Boolean(response?.ok),
      summary: response?.ok ? `Inspected ${first.name || first.path}` : (response?.message || 'Inspection failed'),
      detail: response
    };
  }));

  developerLastResults = results;
  renderDeveloperSubsystems(results);
  renderDeveloperTests(results);
  renderDeveloperFindings(results);

  const passed = results.filter(result => result.ok).length;
  const warnings = results.filter(result => result.warning).length;
  const score = Math.round((passed / results.length) * 100);
  $('developerHealthScore').textContent = `${score}%`;
  $('developerHealthTitle').textContent = score === 100 ? 'All tested systems healthy' : `${results.length - passed} check${results.length - passed === 1 ? '' : 's'} need attention`;
  const failed = results.length - passed - warnings;
  $('developerHealthSummary').textContent = `${passed} passed, ${warnings} warning${warnings === 1 ? '' : 's'}, ${failed} failed.`;
  window.StudioEvents?.emit('health.complete', { passed, warnings, failed, score, total: results.length });

  results.forEach(result => recordDeveloperActivity(
    result.ok ? 'success' : result.warning ? 'warning' : 'error',
    result.name,
    `${result.summary} (${Math.round(result.duration)} ms)`
  ));

  if (button) {
    button.disabled = false;
    button.textContent = 'Run full health check';
  }
}

async function runDeveloperSearchProbe() {
  const query = $('developerSearchProbeInput')?.value.trim() || 'app';
  const target = $('developerSearchProbeResult');
  if (!target) return;
  target.innerHTML = '<p class="muted">Testing the search pipeline…</p>';
  recordDeveloperActivity('action', `Search diagnosis: “${query}”`, 'Testing renderer → IPC → Query Engine → database → renderer.');

  const stages = [];
  const push = (name, ok, detail, duration = 0) => stages.push({ name, ok, detail, duration });

  const startRenderer = performance.now();
  push('Renderer', Boolean(window.studio), window.studio ? 'Studio API is visible.' : 'Studio API is missing.', performance.now() - startRenderer);

  if (!window.studio || typeof window.studio.searchProjectBrain !== 'function') {
    push('IPC bridge', false, 'searchProjectBrain is not exposed by preload.');
  } else {
    const started = performance.now();
    try {
      const response = await window.studio.searchProjectBrain(query, 'search', 50);
      const duration = performance.now() - started;
      push('IPC + Query Engine', Boolean(response?.ok), response?.ok ? 'Request completed.' : (response?.message || 'Request failed.'), duration);
      const matches = Array.isArray(response?.results) ? response.results : [];
      push('Project Brain results', matches.length > 0, `${matches.length} result${matches.length === 1 ? '' : 's'} returned.`, 0);
      push('Dropdown eligibility', matches.length > 0, matches.length > 0 ? 'The UI has results it can display.' : 'No files were returned, so neither search list nor dropdown can display suggestions.', 0);

      target.innerHTML = `
        <div class="developer-pipeline-stages">
          ${stages.map((stage, index) => `
            <div class="developer-pipeline-stage ${stage.ok ? 'healthy' : 'failed'}">
              <span>${stage.ok ? '✓' : '×'}</span>
              <div><b>${escapeHtml(stage.name)}</b><p>${escapeHtml(stage.detail)}</p></div>
              ${stage.duration ? `<em>${Math.round(stage.duration)} ms</em>` : ''}
            </div>${index < stages.length - 1 ? '<div class="developer-pipeline-arrow">↓</div>' : ''}`).join('')}
        </div>
        <div class="developer-search-result-sample">
          <h4>Returned files</h4>
          ${matches.length ? matches.slice(0, 10).map(item => `<button type="button" data-diagnostic-file="${escapeHtml(item.path)}"><b>${escapeHtml(item.name || brainShortName(item.path))}</b><code>${escapeHtml(item.path)}</code></button>`).join('') : '<p class="error-text">No files returned.</p>'}
        </div>`;
      target.querySelectorAll('[data-diagnostic-file]').forEach(button => button.onclick = () => {
        switchStudioPage('brain');
        loadBrainFile(button.dataset.diagnosticFile);
      });
      recordDeveloperActivity(matches.length ? 'success' : 'warning', `Search diagnosis completed: “${query}”`, `${matches.length} results returned in ${Math.round(duration)} ms.`);
    } catch (error) {
      push('IPC + Query Engine', false, error.message);
      target.innerHTML = stages.map(stage => `<div class="developer-pipeline-stage ${stage.ok ? 'healthy' : 'failed'}"><span>${stage.ok ? '✓' : '×'}</span><div><b>${escapeHtml(stage.name)}</b><p>${escapeHtml(stage.detail)}</p></div></div>`).join('');
      recordDeveloperActivity('error', `Search diagnosis failed: “${query}”`, error.message);
    }
  }
}

function refreshDeveloperCentre() {
  renderDeveloperActivity();
  renderDeveloperSubsystems(developerLastResults);
  renderDeveloperTests(developerLastResults);
  renderDeveloperFindings(developerLastResults);
}

// Record meaningful button interactions without logging every mouse movement or keystroke.
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.closest('.developer-centre-panel')) return;
  const label = (button.innerText || button.title || button.id || 'Button').trim().replace(/\s+/g, ' ');
  if (!label) return;
  recordDeveloperActivity('action', label, `Pressed on ${document.body.dataset.activePage || 'Studio'} page.`);
}, true);

document.querySelectorAll('[data-developer-tab]').forEach(button => button.onclick = () => setDeveloperTab(button.dataset.developerTab));
document.querySelectorAll('[data-open-developer-tab]').forEach(button => button.onclick = () => setDeveloperTab(button.dataset.openDeveloperTab));
document.querySelectorAll('[data-developer-filter]').forEach(button => button.onclick = () => {
  developerActivityFilter = button.dataset.developerFilter;
  document.querySelectorAll('[data-developer-filter]').forEach(item => item.classList.toggle('active', item === button));
  renderDeveloperActivity();
});
$('runDeveloperChecks')?.addEventListener('click', runDeveloperHealthCheck);
$('runDeveloperSearchProbe')?.addEventListener('click', runDeveloperSearchProbe);
$('developerSearchProbeInput')?.addEventListener('keydown', event => {
  if (event.key === 'Enter') runDeveloperSearchProbe();
});
$('clearDeveloperActivity')?.addEventListener('click', () => {
  developerActivity = [];
  saveDeveloperActivity();
  renderDeveloperActivity();
});
$('developerFindings')?.addEventListener('click', async event => {
  const button = event.target.closest('[data-developer-repair]');
  if (!button) return;
  if (button.dataset.developerRepair === 'refresh-brain') {
    recordDeveloperActivity('action', 'Project Brain refresh requested', 'Repair action started from Developer Centre.');
    await loadProjectBrain();
    await runDeveloperHealthCheck();
  }
});

recordDeveloperActivity('info', 'Studio session started', `FriendshipTree Studio ${$('studioVersion')?.textContent || ''} renderer loaded.`);
renderDeveloperActivity();


function gitEscape(value) { return escapeHtml(String(value ?? '')); }
function gitChangeLabel(code) {
  const c = String(code || '').trim();
  if (c === '??') return 'Untracked';
  if (c.includes('D')) return 'Deleted';
  if (c.includes('A')) return 'Added';
  if (c.includes('R')) return 'Renamed';
  return 'Modified';
}
async function refreshGitOverview() {
  const summary = $('gitSummary');
  const changes = $('gitChanges');
  const commits = $('gitCommits');
  if (!summary || !changes || !commits) return;
  summary.innerHTML = '<p class="muted">Reading repository…</p>';
  try {
    const data = await window.studio.getGitOverview();
    if (!data?.ok) throw new Error(data?.message || 'Unable to read Git repository.');
    summary.innerHTML = `
      <div><span>Repository</span><b>${data.clean ? 'Clean' : 'Changes present'}</b></div>
      <div><span>Branch</span><b>${gitEscape(data.branch)}</b></div>
      <div><span>Ahead</span><b>${Number(data.ahead || 0)}</b></div>
      <div><span>Behind</span><b>${Number(data.behind || 0)}</b></div>
      <div class="wide"><span>Remote</span><code>${gitEscape(data.remote || 'Not configured')}</code></div>`;
    changes.innerHTML = data.changes.length ? data.changes.map(item => `
      <div class="git-file-row"><span class="git-state">${gitEscape(gitChangeLabel(item.code))}</span><code>${gitEscape(item.path)}</code></div>`).join('') : '<p class="success">Working tree clean.</p>';
    commits.innerHTML = data.commits.length ? data.commits.map(item => `
      <div class="git-commit-row"><code>${gitEscape(item.hash)}</code><div><b>${gitEscape(item.subject)}</b><span>${gitEscape(item.date)} · ${gitEscape(item.author)}</span></div></div>`).join('') : '<p class="muted">No commits returned.</p>';
  } catch (error) {
    summary.innerHTML = `<p class="error-text">${gitEscape(error.message)}</p>`;
  }
}
async function runGitAction(kind) {
  const status = $('gitActionStatus');
  const label = kind === 'push' ? 'Push' : 'Pull';
  const confirmed = window.confirm(kind === 'push' ? 'Push committed changes to GitHub?' : 'Pull the latest GitHub changes? Pull is blocked when local changes exist.');
  if (!confirmed) return;
  status.textContent = `${label} running…`;
  const result = kind === 'push' ? await window.studio.gitPush() : await window.studio.gitPull();
  status.className = result?.ok ? 'success' : 'error-text';
  status.textContent = result?.ok ? (result.stdout || `${label} completed.`) : (result?.message || result?.stderr || `${label} failed.`);
  await refreshGitOverview();
}
$('gitRefresh')?.addEventListener('click', refreshGitOverview);
$('gitOpenGithub')?.addEventListener('click', () => window.studio.openGitHub());
$('gitPush')?.addEventListener('click', () => runGitAction('push'));
$('gitPull')?.addEventListener('click', () => runGitAction('pull'));
