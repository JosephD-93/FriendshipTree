/** Return YYYY-MM-DD in the device's local timezone. */
export function getLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Parse the app's free-text birthday field into day/month/year parts. */
export function parseBirthdayDateGlobal(str) {
  if (!str) return null;
  const MONTHS = {jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11};
  const clean = str.toLowerCase().replace(/[,\/\-\.]/g,' ').replace(/\s+/g,' ').trim();
  const tokens = clean.split(' ');
  let day = null, month = null, year = null;
  tokens.forEach(tok => {
    const stripped = tok.replace(/\D/g,'');
    const mKey = tok.replace(/[^a-z]/g,'').slice(0,3);
    if (MONTHS[mKey] !== undefined) { month = MONTHS[mKey]; return; }
    const num = parseInt(stripped, 10);
    if (Number.isNaN(num)) return;
    if (num > 31) year = num > 100 ? num : (num <= 30 ? 2000 + num : 1900 + num);
    else if (day === null) day = num;
    else if (year === null) year = num > 100 ? num : (num <= 30 ? 2000 + num : 1900 + num);
  });
  if (!day || month === null) return null;
  return { day, month, year: year || null };
}
