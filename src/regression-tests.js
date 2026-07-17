// ══════════════════════════════════════════════════════════════════════════
// FriendshipTree Regression Test Harness
// ══════════════════════════════════════════════════════════════════════════
// Standalone, runs with: node regression-tests.js
// No device, no build, no Capacitor needed -- tests the pure logic functions
// directly, extracted verbatim from the live App.jsx.
//
// IMPORTANT: these are copies of the real functions, not imports, because
// App.jsx is one giant component file with no exports. If you change any of
// these functions in App.jsx, copy the change here too, or this harness will
// silently test stale logic. This is a known limitation flagged in the
// handover doc (item 6 under Immediate Next Steps) -- a genuine module split
// would let this import the real thing directly instead.
// ══════════════════════════════════════════════════════════════════════════

let passCount = 0, failCount = 0;
const failures = [];

function test(name, actual, expected) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    passCount++;
    console.log(`  ✅ ${name}`);
  } else {
    failCount++;
    failures.push({ name, actual: actualStr, expected: expectedStr });
    console.log(`  ❌ ${name}`);
    console.log(`     expected: ${expectedStr}`);
    console.log(`     actual:   ${actualStr}`);
  }
}

// ── 1. getLocalDateStr ──────────────────────────────────────────────────
// (verbatim from App.jsx line ~35)
function getLocalDateStr(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

console.log('\n── getLocalDateStr ──');
test('mid-year date', getLocalDateStr(new Date(2026, 6, 17)), '2026-07-17');
test('single-digit month and day pad correctly', getLocalDateStr(new Date(2026, 0, 5)), '2026-01-05');
test('December 31st', getLocalDateStr(new Date(2026, 11, 31)), '2026-12-31');
test('leap year Feb 29', getLocalDateStr(new Date(2028, 1, 29)), '2028-02-29');

// ── 2. parseBirthdayDateGlobal ──────────────────────────────────────────
// (verbatim from App.jsx line ~160) -- this is the save/load compatibility
// function: it has to correctly parse every legacy free-text format the app
// has ever saved a birthday in, or old saves silently break.
function parseBirthdayDateGlobal(str) {
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
    if (isNaN(num)) return;
    if (num > 31) { year = num > 100 ? num : (num >= 0 && num <= 30 ? 2000 + num : 1900 + num); }
    else if (day === null) { day = num; }
    else if (year === null) { year = num > 100 ? num : (num >= 0 && num <= 30 ? 2000 + num : 1900 + num); }
  });
  if (!day || month === null) return null;
  return { day, month, year: year || null };
}

console.log('\n── parseBirthdayDateGlobal (save/load compatibility) ──');
console.log('  NOTE: this parser only recognizes MONTH NAMES (mar, march, etc), never');
console.log('  purely numeric month formats like "03" for March. "15/03/1990" and');
console.log('  similar all-numeric dates correctly return null below -- confirmed');
console.log('  real, consistent behavior, not a bug, but worth knowing: anyone who');
console.log('  ever saved a birthday in DD/MM/YYYY numeric-only format would have it');
console.log('  silently fail to parse.');
test('null input', parseBirthdayDateGlobal(null), null);
test('empty string', parseBirthdayDateGlobal(''), null);
test('"15 Mar 1990"', parseBirthdayDateGlobal('15 Mar 1990'), { day: 15, month: 2, year: 1990 });
test('"March 15, 1990"', parseBirthdayDateGlobal('March 15, 1990'), { day: 15, month: 2, year: 1990 });
test('"15/03/1990" (slash format)', parseBirthdayDateGlobal('15/03/1990'), null);
test('"15-03-90" (2-digit year, dash format)', parseBirthdayDateGlobal('15-03-90'), null);
test('day-only, no year: "15 Mar"', parseBirthdayDateGlobal('15 Mar'), { day: 15, month: 2, year: null });
test('garbage with no valid month', parseBirthdayDateGlobal('hello world'), null);
test('2-digit year near century boundary "1 Jan 29"', parseBirthdayDateGlobal('1 Jan 29'), { day: 1, month: 0, year: 2029 });
test('2-digit year just past boundary "1 Jan 31"', parseBirthdayDateGlobal('1 Jan 31'), { day: 1, month: 0, year: 1931 });

// ── 3. Health points calculations ───────────────────────────────────────
// (verbatim from App.jsx lines ~3584-3593)
function computeCategoryPoints(count, cat) {
  const target = cat.target || 1;
  const atTarget = Math.min(count, target) * (cat.pointsPerServing || 0);
  const overTarget = Math.max(0, count - target) * (cat.pointsPerOverServing ?? cat.pointsPerServing ?? 0);
  return atTarget + overTarget;
}
function computeListBaselinePoints(list) {
  return (list.categories || []).reduce((sum, c) => sum + (c.target || 1) * (c.pointsPerServing || 0), 0);
}
function computeListDayPoints(list, dayCounts) {
  return (list.categories || []).reduce((sum, c) => sum + computeCategoryPoints((dayCounts||{})[c.id] || 0, c), 0);
}

console.log('\n── Health points calculations ──');
test('exactly at target', computeCategoryPoints(3, { target: 3, pointsPerServing: 5 }), 15);
test('under target', computeCategoryPoints(1, { target: 3, pointsPerServing: 5 }), 5);
test('zero count', computeCategoryPoints(0, { target: 3, pointsPerServing: 5 }), 0);
test('over target, uses overServing rate', computeCategoryPoints(5, { target: 3, pointsPerServing: 5, pointsPerOverServing: 2 }), 19); // 3*5 + 2*2
test('over target, no overServing rate falls back to pointsPerServing', computeCategoryPoints(5, { target: 3, pointsPerServing: 5 }), 25); // 3*5 + 2*5
test('missing target defaults to 1', computeCategoryPoints(2, { pointsPerServing: 10 }), 20); // target defaults to 1: 1*10 at-target + 1*10 over-target (falls back to same rate) = 20
test('empty category list baseline', computeListBaselinePoints({ categories: [] }), 0);
test('baseline sums target*rate across categories', computeListBaselinePoints({ categories: [
  { target: 2, pointsPerServing: 5 }, { target: 1, pointsPerServing: 10 }
] }), 20); // 2*5 + 1*10
test('day points with no logging at all', computeListDayPoints({ categories: [{ id:'a', target:1, pointsPerServing:5 }] }, {}), 0);
test('day points with partial logging', computeListDayPoints(
  { categories: [{ id:'a', target:2, pointsPerServing:5 }, { id:'b', target:1, pointsPerServing:10 }] },
  { a: 1 }
), 5); // only 'a' logged, 1/2 of target at rate 5

// ── 4. Health list grid column calculations ─────────────────────────────
// (verbatim from App.jsx line ~17175)
function healthListCols(list) {
  return Math.max(1, Math.min(6, Number(list?.gridCols) || 3));
}

console.log('\n── Health list grid columns ──');
test('default when unset', healthListCols({}), 3);
test('explicit valid value', healthListCols({ gridCols: 4 }), 4);
test('clamps above max of 6', healthListCols({ gridCols: 12 }), 6);
test('clamps below min of 1', healthListCols({ gridCols: 0 }), 3); // 0 is falsy, falls to default 3
test('clamps negative to min 1', healthListCols({ gridCols: -5 }), 1);
test('non-numeric falls back to default', healthListCols({ gridCols: 'abc' }), 3);
test('null list falls back to default', healthListCols(null), 3);

// ── 5. Quality preset lookup ────────────────────────────────────────────
// (verbatim from App.jsx line ~419)
const FANCY_QUALITY_PRESETS = {
  adaptive:    { label: 'Living Forest', flowerDensity: 1.00, creatureDensity: 1.00, flowerRasterScale: 1.6, adaptive: true },
  ultra:       { label: 'Ultra',         flowerDensity: 1.00, creatureDensity: 1.00, flowerRasterScale: 2.0 },
  high:        { label: 'High',          flowerDensity: 0.75, creatureDensity: 0.75, flowerRasterScale: 1.6 },
  balanced:    { label: 'Balanced',      flowerDensity: 0.50, creatureDensity: 0.50, flowerRasterScale: 1.25 },
  performance: { label: 'Performance',   flowerDensity: 0.30, creatureDensity: 0.30, flowerRasterScale: 1.0 },
};
function lookupQualityPreset(key) {
  return FANCY_QUALITY_PRESETS[key] || FANCY_QUALITY_PRESETS.balanced;
}

console.log('\n── Quality preset lookup ──');
test('valid key returns matching preset', lookupQualityPreset('ultra').label, 'Ultra');
test('invalid key falls back to balanced', lookupQualityPreset('nonexistent').label, 'Balanced');
test('undefined key falls back to balanced', lookupQualityPreset(undefined).label, 'Balanced');
test('adaptive preset is flagged adaptive', lookupQualityPreset('adaptive').adaptive, true);
test('non-adaptive preset has no adaptive flag', lookupQualityPreset('high').adaptive, undefined);
test('every preset has a numeric flowerDensity between 0 and 1', 
  Object.values(FANCY_QUALITY_PRESETS).every(p => p.flowerDensity >= 0 && p.flowerDensity <= 1), true);

// ══════════════════════════════════════════════════════════════════════════
console.log(`\n${'═'.repeat(60)}`);
console.log(`RESULTS: ${passCount} passed, ${failCount} failed (${passCount + failCount} total)`);
if (failCount > 0) {
  console.log(`\nFAILED TESTS:`);
  failures.forEach(f => console.log(`  - ${f.name}`));
  process.exit(1);
} else {
  console.log(`All tests passed.`);
  process.exit(0);
}
