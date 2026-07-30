const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

function toast(message, isError = false) {
  const el = $("#toast");
  el.textContent = message;
  el.style.background = isError ? "#ffd9d4" : "#e9f8ec";
  el.style.color = isError ? "#48130d" : "#102015";
  el.classList.add("show");
  clearTimeout(window.toastTimer);
  window.toastTimer = setTimeout(() => el.classList.remove("show"), 3200);
}

async function run(action, success) {
  try {
    await action();
    if (success) toast(success);
  } catch (error) {
    toast(error.message || String(error), true);
  }
}

function healthText(ok) {
  return ok ? "Healthy" : "Needs attention";
}

function renderVersions(versions) {
  const container = $("#versions");
  container.innerHTML = "";
  $("#versionCount").textContent = `${versions.length} version${versions.length === 1 ? "" : "s"}`;
  if (!versions.length) {
    container.innerHTML = '<p class="empty">No installed Studio versions were found.</p>';
    return;
  }
  versions.forEach(item => {
    const row = document.createElement("div");
    row.className = "version-row";
    row.innerHTML = `
      <div><strong>${item.version}</strong><small>${item.modified ? new Date(item.modified).toLocaleString() : "Date unavailable"}</small></div>
      <span class="badge">${item.status || "Installed"}</span>
      <button class="launch-small">Launch</button>`;
    row.querySelector("button").addEventListener("click", () =>
      run(() => window.launcher.launchStudio(item.version), `Launching Studio ${item.version}`)
    );
    container.appendChild(row);
  });
  if ($('#globalSearchInput')?.value.trim()) runLauncherSearch();
}

async function refresh() {
  try {
    const status = await window.launcher.getStatus();
    $("#currentVersion").textContent = `v${status.current}`;
    $("#releaseCurrent").textContent = status.current;
    $("#releaseCandidate").textContent = status.candidate || "None";
    $("#releaseLast").textContent = status.lastWorking;
    $("#updateCount").textContent = String(status.updates);
    $("#studioHealth").textContent = healthText(status.studioHealthy);
    $("#forgeHealth").textContent = healthText(status.forgeHealthy);
    $("#androidHealth").textContent = status.androidHealthy ? "Available" : "Not found";
    $("#heroStatus").textContent = status.studioHealthy && status.forgeHealthy
      ? "System ready"
      : "One or more components need attention";
    renderVersions(status.versions);

    const logs = await window.launcher.getLogs();
    const activity = $("#activity");
    activity.innerHTML = logs.length
      ? logs.map(line => `<div class="activity-item">${line.replaceAll("&","&amp;").replaceAll("<","&lt;")}</div>`).join("")
      : '<p class="empty">No recent entries.</p>';
  } catch (error) {
    toast(error.message || String(error), true);
  }
}

$("#exportChatGPTProject").addEventListener("click", () =>
  run(() => window.launcher.exportProject(), "Preparing ChatGPT Project handover")
);
$("#refreshAIWorkspace").addEventListener("click", () =>
  run(() => window.launcher.refreshAIWorkspace(), "Refreshing AI Workspace")
);
$("#validateAIWorkspace").addEventListener("click", () =>
  run(() => window.launcher.validateAIWorkspace(), "Validating AI Workspace")
);
$("#exportRequestedFile").addEventListener("click", () =>
  run(() => window.launcher.exportRequestedFile(), "Opening requested-file exporter")
);
$("#openAIWorkspace").addEventListener("click", () =>
  run(() => window.launcher.openAIWorkspace(), "Opening AI Workspace")
);
$("#copyAIInstructions").addEventListener("click", () =>
  run(() => window.launcher.copyAIInstructions(), "Copying Project instructions")
);
$("#launchCurrent").addEventListener("click", () =>
  run(() => window.launcher.launchStudio(), "Launching current Studio")
);
$("#openClassicForge").addEventListener("click", () =>
  run(() => window.launcher.openForge(), "Opening Forge controls")
);
$("#manageRelease").addEventListener("click", () =>
  run(() => window.launcher.openForge(), "Opening recovery controls")
);
$("#refreshButton").addEventListener("click", refresh);
$$("[data-folder]").forEach(button => button.addEventListener("click", () =>
  run(() => window.launcher.openFolder(button.dataset.folder))
));


function normaliseSearchText(value) {
  return String(value || '').toLowerCase().replace(/\s+/g, ' ').trim();
}

function clearLauncherSearch() {
  document.querySelectorAll('.global-search-match, .global-search-muted').forEach(element => {
    element.classList.remove('global-search-match', 'global-search-muted');
  });
  const input = $('#globalSearchInput');
  const clear = $('#clearGlobalSearch');
  if (input) input.value = '';
  if (clear) clear.classList.remove('visible');
}

function runLauncherSearch() {
  const input = $('#globalSearchInput');
  const clear = $('#clearGlobalSearch');
  if (!input) return;
  const query = normaliseSearchText(input.value);
  const tokens = query.split(' ').filter(Boolean);
  document.querySelectorAll('.global-search-match, .global-search-muted').forEach(element => {
    element.classList.remove('global-search-match', 'global-search-muted');
  });
  if (clear) clear.classList.toggle('visible', !!query);
  if (!tokens.length) return;

  const candidates = [
    ...document.querySelectorAll(
      '.tool-button, .metric, .version-row, .delivery-item, .release-list > div, .activity-item, .hero, .panel-heading, .top-actions button'
    )
  ];
  let matches = 0;
  candidates.forEach(element => {
    const text = normaliseSearchText(element.textContent);
    const isMatch = tokens.every(token => text.includes(token));
    element.classList.add(isMatch ? 'global-search-match' : 'global-search-muted');
    if (isMatch) matches += 1;
  });
  if (!matches) {
    toast(`No Launcher items match “${input.value.trim()}”.`, true);
  }
}

const globalSearchInput = $('#globalSearchInput');
const clearGlobalSearchButton = $('#clearGlobalSearch');
if (globalSearchInput) {
  globalSearchInput.addEventListener('input', runLauncherSearch);
  globalSearchInput.addEventListener('keydown', event => {
    if (event.key === 'Escape') clearLauncherSearch();
  });
}
if (clearGlobalSearchButton) clearGlobalSearchButton.addEventListener('click', () => {
  clearLauncherSearch();
  globalSearchInput?.focus();
});


refresh();
setInterval(refresh, 15000);


function escapeText(value) {
  return String(value ?? '').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
}

function deliveryTypeLabel(type) {
  return ({'app-update':'FriendshipTree App','studio-update':'FriendshipTree Studio','launcher-update':'Launcher','ai-workspace-update':'AI Workspace'})[type] || 'Unknown package';
}

async function refreshDeliveries() {
  const items = $('#deliveryItems');
  try {
    const result = await window.launcher.scanDeliveries();
    $('#cloudIncomingPath').textContent = result.folders.cloud;
    $('#localIncomingPath').textContent = result.folders.local;
    $('#deliveryLastScan').textContent = `Last checked ${new Date(result.lastScan).toLocaleTimeString()}`;
    $('#deliverySummary').textContent = result.items.length ? `${result.items.length} delivery${result.items.length === 1 ? '' : 'ies'} waiting` : 'No deliveries waiting';
    $('#updateCount').textContent = String(result.items.length);
    if (!result.items.length) {
      items.innerHTML = '<p class="empty">No update packages were found. Save the file into Google Drive Incoming or Local Incoming.</p>';
      return;
    }
    items.innerHTML = '';
    result.items.forEach(item => {
      const card = document.createElement('div');
      card.className = `delivery-item ${item.ok ? 'valid' : 'invalid'}`;
      const manifest = item.manifest || {};
      card.innerHTML = `
        <div class="delivery-main">
          <div><span class="delivery-state">${item.ok ? '✓ Ready' : '✕ Cannot install'}</span><strong>${escapeText(manifest.displayName || item.name)}</strong></div>
          <small>${escapeText(deliveryTypeLabel(manifest.packageType))}${manifest.version ? ` · v${escapeText(manifest.version)}` : ''} · ${escapeText(item.source)}</small>
          ${manifest.description ? `<p>${escapeText(manifest.description)}</p>` : ''}
          ${item.errors?.length ? `<p class="delivery-errors">${item.errors.map(escapeText).join('<br>')}</p>` : ''}
          <small class="delivery-file">${escapeText(item.name)} · ${manifest.fileCount || 0} file(s)</small>
        </div>
        <button class="primary install-delivery" ${item.ok ? '' : 'disabled'}>${manifest.packageType === 'app-update' ? 'Install, build &amp; send to phone' : 'Install update'}</button>`;
      card.querySelector('.install-delivery').addEventListener('click', async event => {
        const button = event.currentTarget;
        button.disabled = true;
        button.textContent = 'Working…';
        $('#deliveryProgress').textContent = `Starting ${manifest.displayName || item.name}`;
        try {
          const installed = await window.launcher.installDelivery(item.path);
          let message = `${installed.displayName} installed.`;
          if (installed.build?.phoneInstalled) message += ' APK built and installed on your phone.';
          else if (installed.build?.apk) message += ' APK built; phone was unavailable, so it is ready for later installation.';
          if (installed.packageType === 'studio-update' && installed.studioInstall) {
            message += ` Activated Studio ${installed.studioInstall.currentVersion}; ${installed.studioInstall.verifiedFiles.length} file(s) verified.`;
          }
          if (installed.restartRequired) message += ' Restart the Launcher/Studio to load the updated interface.';
          toast(message);
          $('#deliveryProgress').textContent = message;
          await refreshDeliveries();
          await refresh();
        } catch (error) {
          toast(error.message || String(error), true);
          $('#deliveryProgress').textContent = `Failed: ${error.message || error}`;
          button.disabled = false;
          button.textContent = 'Try again';
        }
      });
      items.appendChild(card);
    });
    if ($('#globalSearchInput')?.value.trim()) runLauncherSearch();
  } catch (error) {
    items.innerHTML = `<p class="delivery-errors">${escapeText(error.message || error)}</p>`;
    $('#deliverySummary').textContent = 'Delivery scan failed';
  }
}

$('#scanDeliveries').addEventListener('click', refreshDeliveries);
$$('[data-delivery-folder]').forEach(button => button.addEventListener('click', () => run(() => window.launcher.openDeliveryFolder(button.dataset.deliveryFolder))));
window.launcher.onDeliveryProgress(event => { $('#deliveryProgress').textContent = event.message; });
refreshDeliveries();
setInterval(refreshDeliveries, 60000);
