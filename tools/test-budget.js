const assert = require('assert');
const { deriveBudget, cleanBudget, dueDates } = require('../src/programs/budget');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };
const now = new Date(2026, 9, 2);
const bills = [{ id: 'rent', name: 'Rent', amount: 800, day: 1 }, { id: 'phone', name: 'Phone', amount: 60, day: 15 }, { id: 'hydro', name: 'Hydro', amount: 70, day: 20 }];

test('the current period runs from the last cheque to the day before the next', () => {
  const d = deriveBudget({ bills }, { perCheque: 1683.5, now });
  const p = d.periods[0];
  assert.deepStrictEqual([p.from, p.to, p.current], ['2026-09-23', '2026-10-21', true]);
  assert.deepStrictEqual(p.bills.map((b) => b.date), ['2026-10-01', '2026-10-15', '2026-10-20']);
  assert.strictEqual(p.billsTotal, 930);
  assert.strictEqual(p.left, 753.5);
});

test('each bill lands in the period before the cheque that pays for the next one', () => {
  const d = deriveBudget({ bills }, { perCheque: 1683.5, now });
  assert.deepStrictEqual(d.periods[1].bills.map((b) => b.date), ['2026-11-01', '2026-11-15']);
  assert.deepStrictEqual(d.periods[2].bills.map((b) => b.date), ['2026-11-20', '2026-12-01', '2026-12-15']);
  assert.strictEqual(d.periods.length, 4);
});

test('a period where bills beat the cheque is flagged', () => {
  const d = deriveBudget({ bills: [...bills, { id: 'x', name: 'Dentist', amount: 1500, day: 25 }] }, { perCheque: 1000, now });
  assert.ok(d.short.length >= 1);
  assert.ok(d.periods.some((p) => p.left < 0));
});

test('day 31 falls on the last day of a short month', () => {
  const due = dueDates([{ id: 'a', name: 'A', amount: 10, day: 31 }], '2026-02-01', '2026-03-05');
  assert.deepStrictEqual(due.map((b) => b.date), ['2026-02-28']);
});

test('upcoming bills are the next ones to land, in order', () => {
  const d = deriveBudget({ bills }, { perCheque: 1000, now });
  assert.strictEqual(d.upcoming[0].date, '2026-10-15');   // Oct 1 already passed
  assert.ok(d.upcoming.every((b, i, a) => !i || a[i - 1].date <= b.date));
});

test('no bills: every period is just the cheque', () => {
  const d = deriveBudget({}, { perCheque: 1650, now });
  assert.ok(d.periods.every((p) => p.left === 1650 && p.bills.length === 0));
  assert.deepStrictEqual(d.short, []);
});

test('junk bills are dropped, names cleaned, the list capped', () => {
  const c = cleanBudget({ bills: [{ name: ' <b>Rent</b> ', amount: '800', day: 1.9 }, { name: '', amount: 5, day: 1 }, { name: 'X', amount: -1, day: 1 }, { name: 'Y', amount: 5, day: 40 }, null] });
  assert.deepStrictEqual(c.bills.map((b) => [b.name, b.amount, b.day]), [['bRent/b', 800, 1]]);
  assert.strictEqual(cleanBudget({ bills: Array.from({ length: 50 }, (_, i) => ({ name: 'n' + i, amount: 1, day: 1 })) }).bills.length, 20);
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
