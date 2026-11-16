const assert = require('assert');
const { cleanEntries, deriveEarnings, deriveYearReview } = require('../src/programs/profiles');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };
const now = new Date(2026, 10, 15, 12);

test('junk entries are dropped, good ones kept and tidied', () => {
  const out = cleanEntries([
    { date: '2026-03-01', amount: '120.456', note: '  =SUM(A1) "shift" <b>  ' },
    { date: 'March', amount: 50 }, { date: '2026-03-02', amount: -5 }, { date: '2026-03-03', amount: 1e9 },
    { date: '2026-03-04', amount: 'abc' }, null, 'x',
  ]);
  assert.deepStrictEqual(out, [{ date: '2026-03-01', amount: 120.46, note: 'SUM(A1) shift b' }]);
  assert.deepStrictEqual(cleanEntries({ entries: 1 }), []);
  assert.strictEqual(cleanEntries(Array.from({ length: 900 }, () => ({ date: '2026-01-01', amount: 1 }))).length, 500);
});

test('the limit counts this year only and says what is left', () => {
  const e = deriveEarnings({ entries: [{ date: '2026-02-01', amount: 15000 }, { date: '2026-06-01', amount: 1500 }, { date: '2025-12-31', amount: 999 }] }, now);
  assert.deepStrictEqual([e.earned, e.exemption, e.left, e.over], [16500, 16200, 0, 300]);
});

test('the year review carries expenses out and keeps income totals', () => {
  const r = deriveYearReview({
    pwd: {}, cdb: {}, cgeb: null,
    earnings: { entries: [{ date: '2026-11-15', amount: 200, note: 'Cafe shift' }] },
    expenses: { entries: [{ date: '2026-11-15', amount: 40, note: 'Bus pass' }, { date: '2026-12-01', amount: 99 }] },
  }, now);
  const mine = r.items.filter((i) => i.what.startsWith('Work') || i.what.startsWith('Expense'));
  assert.deepStrictEqual(mine, [{ date: '2026-11-15', what: 'Work earnings: Cafe shift', amount: 200 }, { date: '2026-11-15', what: 'Expense: Bus pass', amount: -40 }]);
  assert.strictEqual(r.totals.expenses, 40);
  assert.strictEqual(r.totals.earnings, 200);
  assert.strictEqual(r.totals.all, Math.round((r.totals.benefits + r.totals.credits + 200) * 100) / 100);
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
