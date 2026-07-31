// ============================================================================
// FRIENDSHIPTREE — NATIVE CONTACTS + NOTIFICATIONS  (drop-in code)
// ============================================================================
// These replace existing functions in src/App.jsx. They are NATIVE-AWARE:
//   - On the phone app (Capacitor) they use the real Android plugins.
//   - In the browser / PWA they fall back to the existing web behaviour.
// They access the plugins through window.Capacitor at runtime, so the WEB
// build never imports the plugins and never breaks.
//
// Follow NATIVE-FEATURES-GUIDE.md for the install + manifest steps. Only paste
// these AFTER you've installed the matching plugin (the guide says when).
// ============================================================================


// ════════════════════════════════════════════════════════════════════════
// PART B1 — CONTACTS: replace the whole `handleImportContact` function
// (currently around line 1770 in App.jsx). Pick ONE contact, fill the node.
// ════════════════════════════════════════════════════════════════════════
const handleImportContact = async () => {
  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  // ---- NATIVE: real Android contacts via @capacitor-community/contacts ----
  if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.Contacts) {
    try {
      const Contacts = window.Capacitor.Plugins.Contacts;
      const perm = await Contacts.requestPermissions();
      if (perm.contacts !== 'granted') { showToast('Contacts permission denied'); return; }
      const result = await Contacts.pickContact({
        projection: { name: true, phones: true, image: true }
      });
      const c = result && result.contact;
      if (!c) return;
      const updates = { syncDismissed: true };
      if (c.name && c.name.display) updates.label = c.name.display;
      if (c.phones && c.phones.length) updates.phone = c.phones[0].number;
      if (c.image && c.image.base64String) {
        updates.img = 'data:image/jpeg;base64,' + c.image.base64String;
      }
      setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, ...updates } : n));
      // persist the photo so it survives app restarts
      if (updates.img && typeof savePhotoToDB === 'function') savePhotoToDB(selectedNodeId, updates.img);
      showToast('Contact imported!');
      return;
    } catch (e) {
      console.warn('Native contact pick failed:', e);
      showToast('Could not open contacts');
      return;
    }
  }

  // ---- WEB / PWA: existing browser Contacts API behaviour ----
  try {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      const props = ['name', 'tel', 'icon'];
      const contacts = await navigator.contacts.select(props, { multiple: false });
      if (contacts.length > 0) {
        const contact = contacts[0];
        let updates = { syncDismissed: true };
        if (contact.name?.length) updates.label = contact.name[0];
        if (contact.tel?.length) updates.phone = contact.tel[0];
        if (contact.icon?.length) {
          const blob = contact.icon[0];
          const blobReader = new FileReader();
          blobReader.onload = ev => { updates.img = ev.target.result; setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, ...updates } : n)); };
          blobReader.readAsDataURL(blob);
        }
        setNodes(prev => prev.map(n => n.id === selectedNodeId ? { ...n, ...updates } : n));
        showToast("Contact imported!");
      }
    } else throw new Error("API not supported");
  } catch (e) {
    showToast('Contacts unavailable on this device — enter details manually');
  }
};


// ════════════════════════════════════════════════════════════════════════
// PART B2 — CONTACTS: replace the whole `addFriendsFromContacts` function
// (currently around line 1800). Pick MANY contacts, spawn a node for each.
// NOTE: your code spawns nodes via `spawnNodes(...)`. If your bulk-add uses a
// different helper, keep that call — only the contact-fetching part changes.
// ════════════════════════════════════════════════════════════════════════
const addFriendsFromContacts = async () => {
  const isNative = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());

  // ---- NATIVE ----
  if (isNative && window.Capacitor.Plugins && window.Capacitor.Plugins.Contacts) {
    try {
      const Contacts = window.Capacitor.Plugins.Contacts;
      const perm = await Contacts.requestPermissions();
      if (perm.contacts !== 'granted') { showToast('Contacts permission denied'); return; }
      // getContacts returns ALL contacts; we let the user multi-pick instead
      // by calling pickContact repeatedly is clunky, so we read all and add.
      const res = await Contacts.getContacts({ projection: { name: true, phones: true, image: true } });
      const list = (res && res.contacts) || [];
      if (!list.length) { showToast('No contacts found'); return; }
      // Map to the shape your spawnNodes expects: {label, phone, img}
      const mapped = list.slice(0, 25).map(c => ({
        label: (c.name && c.name.display) || 'Friend',
        phone: (c.phones && c.phones[0] && c.phones[0].number) || '',
        img: (c.image && c.image.base64String) ? ('data:image/jpeg;base64,' + c.image.base64String) : undefined,
      }));
      if (typeof spawnNodes === 'function') spawnNodes(mapped);
      showToast(`Added ${mapped.length} from contacts`);
      return;
    } catch (e) {
      console.warn('Native contacts bulk add failed:', e);
      showToast('Could not read contacts');
      return;
    }
  }

  // ---- WEB / PWA ----
  try {
    if ('contacts' in navigator && 'ContactsManager' in window) {
      const props = ['name', 'tel', 'icon'];
      const contacts = await navigator.contacts.select(props, { multiple: true });
      // ... keep your existing web mapping/spawn logic here ...
      showToast(`Added ${contacts.length} from contacts`);
    } else throw new Error("API not supported");
  } catch (e) {
    showToast('Contacts unavailable on this device');
  }
};


// ════════════════════════════════════════════════════════════════════════
// PART C1 — NOTIFICATIONS: replace `requestNotifications` (around line 2390)
// Native-aware permission request.
// ════════════════════════════════════════════════════════════════════════
const requestNotifications = async () => {
  const LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;

  // ---- NATIVE ----
  if (LN) {
    try {
      let perm = await LN.checkPermissions();
      if (perm.display !== 'granted') perm = await LN.requestPermissions();
      const granted = perm.display === 'granted';
      setNotifPermission(granted ? 'granted' : 'denied');
      if (granted) {
        showToast('🔔 Notifications enabled!');
        // schedule the birthday reminders right away
        if (typeof scheduleBirthdayReminders === 'function') scheduleBirthdayReminders();
      }
      return;
    } catch (e) {
      console.warn('Native notif permission failed:', e);
    }
  }

  // ---- WEB / PWA ----
  if (!('Notification' in window)) { showToast('Notifications not supported in this browser'); return; }
  const perm = await Notification.requestPermission();
  setNotifPermission(perm);
  if (perm === 'granted') showToast('🔔 Notifications enabled!');
};


// ════════════════════════════════════════════════════════════════════════
// PART C2 — NOTIFICATIONS: ADD these two NEW functions near requestNotifications.
// Birthday reminders + "time to reconnect" nudges, native only.
// ════════════════════════════════════════════════════════════════════════

// Schedule a yearly reminder on each friend's birthday (9am).
const scheduleBirthdayReminders = async () => {
  const LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  if (!LN) return; // web — skip
  try {
    const MONTHS = {Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
    const notifs = [];
    nodes.filter(n => n.birthday && n.type !== 'hub' && n.type !== 'flower' && n.id !== 'me').forEach((n, i) => {
      const parts = String(n.birthday).split(/[\s,]+/);
      let day = null, month = null;
      parts.forEach(p => {
        const mon = MONTHS[p.replace(/[^A-Za-z]/g,'').slice(0,3)];
        const num = parseInt(p.replace(/\D/g,''), 10);
        if (mon) month = mon;
        else if (num >= 1 && num <= 31) day = num;
      });
      if (!day || !month) return;
      const now = new Date();
      let next = new Date(now.getFullYear(), month - 1, day, 9, 0, 0);
      if (next < now) next = new Date(now.getFullYear() + 1, month - 1, day, 9, 0, 0);
      notifs.push({
        id: 10000 + i,
        title: '🎂 Birthday today',
        body: `It's ${n.label}'s birthday! Send them a message.`,
        schedule: { at: next, repeats: true, every: 'year' },
      });
    });
    if (notifs.length) await LN.schedule({ notifications: notifs });
  } catch (e) { console.warn('Birthday schedule failed:', e); }
};

// Schedule staggered "time to reconnect" nudges for neglected friends.
const scheduleReconnectReminders = async () => {
  const LN = window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.LocalNotifications;
  if (!LN) return;
  try {
    const stale = nodes
      .filter(n => n.type !== 'hub' && n.type !== 'flower' && n.id !== 'me')
      .filter(n => (n.interactionScore || 0) < 200) // matches your "red" threshold
      .slice(0, 5);
    const notifs = stale.map((n, i) => ({
      id: 20000 + i,
      title: '🌱 Time to reconnect',
      body: `You haven't connected with ${n.label} in a while.`,
      schedule: { at: new Date(Date.now() + (i + 1) * 3 * 86400000) }, // every ~3 days
    }));
    if (notifs.length) await LN.schedule({ notifications: notifs });
  } catch (e) { console.warn('Reconnect schedule failed:', e); }
};


// ════════════════════════════════════════════════════════════════════════
// PART C3 — NOTIFICATIONS: ADD this effect so birthdays (re)schedule whenever
// the friend list changes and permission is granted. Put it near your other
// useEffect hooks.
// ════════════════════════════════════════════════════════════════════════
/*
useEffect(() => {
  if (notifPermission === 'granted') {
    scheduleBirthdayReminders();
  }
}, [notifPermission, nodes]);
*/


// ════════════════════════════════════════════════════════════════════════
// PART A — PHOTO PERSISTENCE (native filesystem fallback) — OPTIONAL
// Only needed IF the navigator.storage.persist() fix didn't fully solve faces
// vanishing on the native app. Uses @capacitor/filesystem. Ask before wiring
// this in — it changes how every photo is saved/loaded. (Guide explains.)
// ════════════════════════════════════════════════════════════════════════
