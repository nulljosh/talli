const assert = require('assert');
const { deriveSupplements, cleanSupplements, CATALOG } = require('../src/programs/supplements');

let passed = 0, failed = 0;
const test = (name, fn) => { try { fn(); console.log(`  [OK] ${name}`); passed++; } catch (e) { console.log(`  [FAIL] ${name}: ${e.message}`); failed++; } };
const now = new Date(2026, 9, 2); // 2026-10-02

test('nothing turned on, nothing on the calendar', () => {
  const d = deriveSupplements({}, now);
  assert.strictEqual(d.upcoming.length, 0);
  assert.strictEqual(d.monthly, 0);
  assert.strictEqual(d.items.length, CATALOG.length);
});

test('monthly supplements ride the next six cheques', () => {
  const d = deriveSupplements({ items: { transport: { on: true }, dog: { on: true } } }, now);
  const t = d.upcoming.filter((e) => e.id === 'transport');
  assert.deepStrictEqual(t.map((e) => e.date), ['2026-10-21', '2026-11-18', '2026-12-16', '2027-01-20', '2027-02-24', '2027-03-24']);
  assert.strictEqual(d.upcoming.length, 12);
  assert.strictEqual(d.monthly, 147);
  assert.strictEqual(t[0].remindOn, '2026-10-20');
  assert.strictEqual(t[0].amount, 52);
});

test('diet needs an amount before it lands on the calendar', () => {
  const d = deriveSupplements({ items: { diet: { on: true } } }, now);
  assert.strictEqual(d.items.find((i) => i.id === 'diet').needs, 'amount');
  assert.strictEqual(d.upcoming.length, 0);
  const ok = deriveSupplements({ items: { diet: { on: true, amount: 60 } } }, now);
  assert.strictEqual(ok.upcoming.length, 6);
  assert.strictEqual(ok.monthly, 60);
});

test('bus pass renews on the 1st of the chosen month, reminder a week before', () => {
  const d = deriveSupplements({ items: { buspass: { on: true, month: 3 } } }, now);
  assert.deepStrictEqual(d.upcoming.map((e) => [e.date, e.remindOn, e.amount]), [['2027-03-01', '2027-02-22', 45]]);
  assert.strictEqual(d.monthly, 0, 'an annual fee is not monthly income');
});

test('a renewal month already past rolls to next year; this month still ahead stays', () => {
  assert.strictEqual(deriveSupplements({ items: { buspass: { on: true, month: 10 } } }, now).upcoming[0].date, '2027-10-01');
  assert.strictEqual(deriveSupplements({ items: { buspass: { on: true, month: 11 } } }, now).upcoming[0].date, '2026-11-01');
});

test('bus pass without a month is flagged', () => {
  assert.strictEqual(deriveSupplements({ items: { buspass: { on: true } } }, now).items.find((i) => i.id === 'buspass').needs, 'month');
});

test('reminders can be switched off per supplement', () => {
  const d = deriveSupplements({ items: { transport: { on: true, remind: false } } }, now);
  assert.ok(d.upcoming.every((e) => e.remind === false));
});

test('junk input is dropped', () => {
  const c = cleanSupplements({ items: { hacker: { on: true }, transport: { on: 'yes', amount: 5000, month: 13 }, diet: { on: true, amount: '60', month: 4.9 } } });
  assert.deepStrictEqual(c, { items: { transport: { on: false, remind: true }, diet: { on: true, remind: true, amount: 60, month: 4 } } });
  assert.deepStrictEqual(cleanSupplements(null), { items: {} });
});

console.log(`\nResults: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
