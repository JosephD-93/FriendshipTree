const FT_SAVE_SIZE_WARNING = 2_000_000;
let ftDiagBuffer = null;

function installDiagnosticLogger() {
  if (typeof window === 'undefined') return;
  window.ftDiagLog = function ftDiagLog(...args) {
    const msg = args.map(value => {
      if (value === undefined) return 'undefined';
      if (typeof value === 'object') {
        try { return JSON.stringify(value); } catch { return String(value); }
      }
      return String(value);
    }).join(' ');
    const line = `[${new Date().toISOString()}] ${msg}`;
    console.log(line);
    try {
      const prefs = window.Capacitor?.Plugins?.Preferences;
      if (!prefs || typeof prefs.set !== 'function') return;
      const append = existing => {
        const next = `${existing || ''}${line}\n`;
        const capped = next.length > 200_000 ? next.slice(-200_000) : next;
        ftDiagBuffer = capped;
        prefs.set({ key: 'ft_diag_log', value: capped }).catch(() => {});
      };
      if (ftDiagBuffer !== null) append(ftDiagBuffer);
      else prefs.get({ key: 'ft_diag_log' }).then(result => append(result?.value || '')).catch(() => append(''));
    } catch {}
  };
}

installDiagnosticLogger();

function log(...args) {
  if (typeof window !== 'undefined' && typeof window.ftDiagLog === 'function') {
    window.ftDiagLog(...args);
  }
}

export function saveData(key, value) {
  try {
    const json = JSON.stringify(value);
    if (json.length > FT_SAVE_SIZE_WARNING) log(`⚠️ [Persistence] key="${key}" unexpectedly large: ${json.length} chars`);
    localStorage.setItem(key, json);
    return true;
  } catch (error) {
    log(`❌ [Persistence] SAVE FAILED key="${key}": ${error.message}`);
    return false;
  }
}

export function loadData(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallback;
    return JSON.parse(raw);
  } catch (error) {
    log(`❌ [Persistence] LOAD FAILED key="${key}": ${error.message} — using fallback`);
    return fallback;
  }
}

export function saveRaw(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    log(`❌ [Persistence] SAVE FAILED (raw) key="${key}": ${error.message}`);
    return false;
  }
}

export function utf8ToBase64(value) {
  const bytes = new TextEncoder().encode(value);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}

function logStartupSnapshot() {
  if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
  try {
    log('========== NEW APP SESSION ==========');
    const raw = localStorage.getItem('ft_nodes');
    const meta = localStorage.getItem('ft_save_meta');
    const parsed = raw ? JSON.parse(raw) : [];
    const friendIds = parsed.filter(node => node.type === 'friend').map(node => node.id);
    log('[FT-DIAG] PRE-REACT startup check:');
    log('[FT-DIAG]   ft_nodes raw length (chars):', raw ? raw.length : 0);
    log('[FT-DIAG]   total nodes:', parsed.length, '| friend nodes:', friendIds.length);
    log('[FT-DIAG]   last 5 friend IDs:', friendIds.slice(-5));
    log('[FT-DIAG]   ft_save_meta:', meta);
  } catch (error) {
    log('[FT-DIAG] PRE-REACT startup check FAILED:', error.message);
  }
}

logStartupSnapshot();
