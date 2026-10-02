const assert = require('assert');
const { deriveWhatIf, exemptionFor } = require('../src/programs/whatif');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };
const now = new Date(2026, 9, 2);
const opts = { base: 1483.5, household: 'single', earnedSoFar: 0, now };

test('20 hours a week at $20 is $1,733.33 a month, gross', () => {
  assert.strictEqual(deriveWhatIf({ wage: 20, hours: 20, start: '2026-11' }, opts).gross, 1733.33);
});

test('under the exemption, working costs nothing until the line is crossed', () => {
  const d = deriveWhatIf({ wage: 20, hours: 20, start: '2026-11' }, opts);
  assert.strictEqual(d.rows[0].reduction, 0);
  assert.strictEqual(d.rows[1].reduction, 0);                      // Nov, Dec 2026: $3,467 of $16,200
  assert.strictEqual(d.firstClawback, '2027-10');                  // 2027 exemption is assumed equal to 2026
  assert.strictEqual(d.rows.find((r) => r.month === '2027-10').reduction, 1133.33);
  assert.strictEqual(d.totalEarnings, 20800);
  assert.strictEqual(d.totalReduction, 1133.33);
  assert.strictEqual(d.keep, 19666.67);
  assert.strictEqual(d.keepPct, 95);
  assert.strictEqual(d.assumed, true, 'a 2027 exemption BC has not posted is flagged as assumed');
});

test('a full time wage uses the whole exemption fast and ends assistance', () => {
  const d = deriveWhatIf({ wage: 30, hours: 40, start: '2026-11' }, opts);
  assert.strictEqual(d.rows.find((r) => r.month === '2027-04').reduction, 1483.5);   // capped at the monthly cheque
  assert.strictEqual(d.assistanceEnds, '2027-04');
  assert.ok(d.better > 0, 'still ahead of not working');
});

test('over the line every extra dollar is lost until assistance runs out', () => {
  const d = deriveWhatIf({ wage: 30, hours: 40, start: '2027-01' }, { ...opts, months: 12 });
  const apr = d.rows.find((r) => r.month === '2027-04');
  assert.strictEqual(apr.assistance, 0);
  assert.strictEqual(apr.total, 5200);                              // wages only
});

test('couples get the bigger shared exemption', () => {
  const single = deriveWhatIf({ wage: 25, hours: 25, start: '2026-11' }, opts);
  const couple = deriveWhatIf({ wage: 25, hours: 25, start: '2026-11' }, { ...opts, household: 'couple_both' });
  assert.ok(couple.totalReduction < single.totalReduction);
  assert.strictEqual(exemptionFor(2026, 'couple_both').amount, 32400);
});

test('earnings already logged this year count against the exemption', () => {
  const none = deriveWhatIf({ wage: 20, hours: 20, start: '2026-11' }, opts);
  const some = deriveWhatIf({ wage: 20, hours: 20, start: '2026-11' }, { ...opts, earnedSoFar: 14000 });
  assert.strictEqual(none.rows[1].reduction, 0);
  assert.ok(some.rows[0].reduction > 0 || some.rows[1].reduction > 0);
  assert.strictEqual(some.room, 2200);
});

test('room and safe hours for the rest of this year', () => {
  const d = deriveWhatIf({ wage: 20, hours: 20, start: '2026-11' }, { ...opts, earnedSoFar: 10000 });
  assert.strictEqual(d.room, 6200);
  assert.strictEqual(d.safeHours, 35.77);                           // 6200 / (20 * 2 months of weeks, Nov and Dec)
});

test('no exemption on file for a single parent: say so instead of guessing', () => {
  const d = deriveWhatIf({ wage: 20, hours: 20, start: '2026-11' }, { ...opts, household: 'single_parent' });
  assert.strictEqual(d.unknown, true);
});

test('bad input gives no answer', () => {
  assert.strictEqual(deriveWhatIf({ wage: 0, hours: 20 }, opts), null);
  assert.strictEqual(deriveWhatIf({ wage: 20, hours: 200 }, opts), null);
  assert.strictEqual(deriveWhatIf({ wage: 20, hours: 20 }, { ...opts, base: 0 }), null);
  assert.strictEqual(deriveWhatIf(null, opts), null);
});

test('the note carries no em dash', () => assert.ok(!JSON.stringify(deriveWhatIf({ wage: 20, hours: 20 }, opts)).includes('—')));

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
