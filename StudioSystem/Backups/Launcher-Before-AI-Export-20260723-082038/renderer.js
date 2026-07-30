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

refresh();
setInterval(refresh, 15000);
